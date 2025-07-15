/* =========================================================
   0.  DOM-довідник
   ======================================================= */
'use strict';

const $ = (id) => document.getElementById(id);
const els = {
  mapBox   : $('map'),
  list     : $('event-list'),
  catalog  : $('events-catalog'),
  search   : $('searchInput'),
  burger   : $('burger'),
  mainNav  : document.querySelector('.main-nav'),
  navMenu  : document.querySelector('.nav-menu'),
  toggleHdr: $('toggle-event-list'),
};

/* =========================================================
   1.  Базові дані (events + locations)
   ======================================================= */

/* 1.0  «статичні» події  --------------------------------- */
const seedEvents = [
  { name:'Концерт гурту XYZ',  description:'Великий концерт популярного гурту XYZ на площі Незалежності.', date:'2025-07-10', type:'Музика',  image:'xyz-concert.png',  venueId:4 },
  { name:'Кінопоказ просто неба', description:'Вечірній кінопоказ у Центральному парку.', date:'2025-07-12', type:'Кіно',    image:'cinema-openair.jpg', venueId:2 },
  { name:'Виставка художників', description:'Виставка сучасного живопису у міській галереї.', date:'2025-07-15', type:'Виставка', image:'art-exhibition.jpg', venueId:3 },
  { name:'Відкрите тренування з йоги', description:'Ранкове тренування з йоги у парку.', date:'2025-07-13', type:'Спорт',   image:'yoga-training.jpg',  venueId:2 },
  { name:'Лекція з історії міста', description:'Пізнавальна лекція з історії міста у Молодіжному центрі.', date:'2025-07-14', type:'Навчання', image:'history-lecture.jpg', venueId:1 },
  { name:'Міський фестиваль музики', description:'Open-air фестиваль музики на міському стадіоні.', date:'2025-07-18', type:'Музика',  image:'music-festival.jpg',  venueId:4 },
  { name:'Вечір короткометражок', description:'Перегляд короткометражних фільмів у Молодіжному центрі.', date:'2025-07-20', type:'Кіно',    image:'short-films.jpg',    venueId:5 },
  { name:'Виставка фотографій', description:'Фотовиставка сучасних авторів у міській галереї.', date:'2025-07-22', type:'Виставка', image:'photo-exhibition.jpg', venueId:3 },
  { name:'Змагання з бігу', description:'Міські змагання з бігу у Центральному парку.', date:'2025-07-24', type:'Спорт',   image:'running-competition.jpg', venueId:2 },
  { name:'Майстер-клас з малювання', description:'Майстер-клас з акварелі у Художній школі.', date:'2025-07-26', type:'Навчання', image:'art-masterclass.jpg',  venueId:1 },
];

/* 1.1  додаємо auto-_id + кеш користувача ---------------- */
let idSeed = 1;
const events = seedEvents.map(ev => ({ _id:idSeed++, ...ev }));

const stored = JSON.parse(localStorage.getItem('userEvents') || '[]');
stored.forEach(ev => { ev._id ??= idSeed++; events.push(ev); });
localStorage.setItem('userEvents', JSON.stringify(stored));

/* =========================================================
   Locations
   ======================================================= */
const locations = [
  { id:1, name:'Площа Незалежності', address:'м. Суми, пл. Незалежності 1', contact:'+380 12 345 67 89', description:'Центральна площа міста.', image:'square.jpg',   lat:50.9110, lng:34.8020 },
  { id:2, name:'Центральний парк',   address:'м. Суми, вул. Паркова 12',   contact:'+380 98 765 43 21', description:'Місце для кінопоказів просто неба.', image:'park.jpg',   lat:50.90547, lng:34.80111 },
  { id:3, name:'Міська галерея',     address:'м. Суми, вул. Мистецька 5',  contact:'+380 55 555 55 55', description:'Галерея сучасного мистецтва.', image:'art-school.jpg', lat:50.90814, lng:34.80058 },
  { id:4, name:'Міський стадіон',    address:'м. Суми, вул. Кустовська 11', contact:'+380 11 223 34 45', description:'Спортивні та open-air події.', image:'stadium.jpg', lat:50.90265, lng:34.79981 },
  { id:5, name:'Молодіжний центр',   address:'м. Суми, вул. Молодіжна 10', contact:'+380 22 334 45 56', description:'Лекції й культурні події.', image:'youth-center.jpg', lat:50.91273, lng:34.80748 },
];

/* синхронізуємо координати подій */
locations.forEach(loc =>
  events.filter(ev=>ev.venueId===loc.id).forEach(ev=>{
    ev.lat = loc.lat; ev.lng = loc.lng;
  })
);

window.events = events;
window.locations = locations;

/* =========================================================
   2.  Карта (Leaflet + MarkerCluster)
   ======================================================= */
let map = null, cGrp = null;
if (els.mapBox && window.L) {
  map = L.map(els.mapBox).setView([50.907,34.798],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              { attribution:'© OpenStreetMap' }).addTo(map);
  cGrp = L.markerClusterGroup().addTo(map);
}

/* режим вибору координат при додаванні */
let pickMode=false, tempMarker=null;
if(map){
  map.on('click',e=>{
    if(!pickMode) return;
    const {lat,lng}=e.latlng;
    if(tempMarker) map.removeLayer(tempMarker);
    tempMarker=L.marker([lat,lng]).addTo(map)
               .bindPopup(`📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
    $('#evLat').value=lat.toFixed(6); $('#evLng').value=lng.toFixed(6);
    pickMode=false; $('#pickCoordsBtn').textContent='📍 Обрати на карті';
  });
}

/* тип → клас/іконка */
const typeInfo={
  Музика:{cls:'music circle',fa:'fa-music'},
  Кіно:{cls:'cinema rounded',fa:'fa-film'},
  Виставка:{cls:'art rhombus',fa:'fa-paintbrush'},
  Спорт:{cls:'sport hexagon',fa:'fa-person-running'},
  Навчання:{cls:'study circle',fa:'fa-book-open'}
};
const markerIcon=t=>{
  const i=typeInfo[t]||{cls:'default rounded',fa:'fa-map-pin'};
  return L.divIcon({
    className:`marker ${i.cls}`,
    html:`<i class="fa-solid ${i.fa}"></i>`,
    iconSize:[24,24], popupAnchor:[0,-12]
  });
};
window.addEventListener('resize',()=>map?.invalidateSize());

/* =========================================================
   3.  Рендер: списки / каталог / маркери
   ======================================================= */
function createCard(ev,isCatalog=false){
  const detailURL=`place.html?id=${ev._id}`;

  const el=document.createElement(isCatalog?'a':'div');
  el.className=isCatalog?'catalog-card':'event-card';
  if(isCatalog) el.href=detailURL;

  el.innerHTML=`
    <img src="images/${ev.image}" alt="${ev.name}" loading="lazy">
    <div class="${isCatalog?'inner':'event-details'}">
      <h3>${ev.name}</h3>
      ${isCatalog?'':`<p>${ev.description}</p>`}
      <p class="${isCatalog?'meta':'event-meta'}">
        <span>📅 ${ev.date}</span><span>📂 ${ev.type}</span>
      </p>
      ${isCatalog?'':`<a class="detail-button" href="${detailURL}">Детальніше</a>`}
    </div>
    <button class="delete-btn" data-id="${ev._id}" title="Видалити">🗑️</button>`;
  return el;
}

function renderEventList(arr){
  if(!els.list) return;
  els.list.innerHTML=arr.length
    ? arr.map(ev=>createCard(ev).outerHTML).join('')
    : '<p class="empty-state">😔 Подій не знайдено</p>';
  if(arr.length) arr.forEach((ev,i)=>els.list.children[i].replaceWith(createCard(ev)));
}

function renderCatalog(arr){
  if(!els.catalog) return;
  els.catalog.innerHTML=arr.length
    ? arr.map(ev=>createCard(ev,true).outerHTML).join('')
    : '<p class="empty-state">😕 За вибраними фільтрами подій немає</p>';
  if(arr.length) arr.forEach((ev,i)=>els.catalog.children[i].replaceWith(createCard(ev,true)));
}

function renderMapMarkers(arr){
  if(!map) return;
  cGrp.clearLayers();
  arr.forEach(ev=>{
    L.marker([ev.lat,ev.lng],{icon:markerIcon(ev.type)})
      .bindPopup(`<b>${ev.name}</b><br>${ev.date}<br>${ev.type}<br>
                  <a href="venue.html?id=${ev.venueId}">🏛 Заклад</a>`)
      .on('click',()=>openModal(ev))
      .addTo(cGrp);
  });
}

/* первинний рендер */
renderEventList(events); renderMapMarkers(events);

/* =========================================================
   3.1  Видалення подій
   ======================================================= */
function deleteEvent(id){
  const idx=events.findIndex(ev=>ev._id===id);
  if(idx===-1) return;
  events.splice(idx,1);

  const cached=JSON.parse(localStorage.getItem('userEvents')||'[]')
                .filter(ev=>ev._id!==id);
  localStorage.setItem('userEvents',JSON.stringify(cached));

  renderEventList(events); renderMapMarkers(events); applyCatalogFilter();
}

['list','catalog'].forEach(key=>{
  els[key]?.addEventListener('click',e=>{
    const btn=e.target.closest('.delete-btn');
    if(!btn) return;
    if(!confirm('Ви впевнені, що хочете видалити цю подію?')) return;
    deleteEvent(Number(btn.dataset.id));
  });
});

/* =========================================================
   4.  Фільтри + пошук
   ======================================================= */
function applyFilters(){
  const cat=$('category')?.value??'all';
  const ven=$('venue')?.value??'all';
  const from=$('from')?.value??'';
  const to=$('to')?.value??'';
  const q=(els.search?.value||'').trim().toLowerCase();

  const list=events.filter(ev=>{
    const okCat =cat==='all'||ev.type===cat;
    const okVen =ven==='all'||String(ev.venueId)===ven;
    const okFrom=!from||ev.date>=from;
    const okTo  =!to  ||ev.date<=to;
    const okName=!q   ||ev.name.toLowerCase().includes(q);
    return okCat&&okVen&&okFrom&&okTo&&okName;
  });

  renderEventList(list); renderMapMarkers(list);
}
['category','venue','from','to'].forEach(id=>$(id)?.addEventListener('change',applyFilters));
$('filterButton')?.addEventListener('click',e=>{e.preventDefault();applyFilters();});
els.search?.addEventListener('input',applyFilters);

/* ── синхронізація дат ── */
const fromInp=$('from'), toInp=$('to');
if(fromInp&&toInp){
  fromInp.addEventListener('change',()=>{
    if(!toInp.value||toInp.value<fromInp.value) toInp.value=fromInp.value;
  });
}

/* заповнюємо селект локацій */
document.addEventListener('DOMContentLoaded',()=>{
  const vSel=$('venue');
  if(vSel){
    locations.forEach(l=>{
      const opt=document.createElement('option');
      opt.value=l.id; opt.textContent=`📍 ${l.name}`; vSel.appendChild(opt);
    });
  }
});

/* =========================================================
   5.  Toggle списку подій
   ======================================================= */
els.toggleHdr?.addEventListener('click',()=>{
  els.list.classList.toggle('active');
  els.toggleHdr.textContent=els.list.classList.contains('active')
    ?'Список подій ▲':'Список подій ▼';
});

/* =========================================================
   6.  Modal
   ======================================================= */
const modal=$('eventModal'), modalTitle=$('modal-title');
const modalImg=$('modal-image'), modalDesc=$('modal-description');
const modalDate=$('modal-date'), modalType=$('modal-type');
const closeBtn=document.querySelector('.close-button');

const venueBox=$('venue-info');
const vName=$('modal-venue-name'), vAddr=$('modal-venue-address');
const vCont=$('modal-venue-contact'), vDes=$('modal-venue-description');
const vImg=$('modal-venue-image');

function openModal(ev){
  modalTitle.textContent=ev.name;
  modalImg.src=`images/${ev.image}`; modalImg.alt=ev.name;
  modalDesc.textContent=ev.description;
  modalDate.textContent=`📅 ${ev.date}`;
  modalType.textContent=`📂 ${ev.type}`;

  const venue=locations.find(l=>l.id===ev.venueId);
  if(venue){
    vName.innerHTML=`🏛 <a href="venue.html?id=${venue.id}">${venue.name}</a>`;
    vAddr.textContent=`📍 ${venue.address}`;
    vCont.textContent=`📞 ${venue.contact}`;
    vDes.textContent =`ℹ️ ${venue.description}`;
    vImg.src=`images/${venue.image}`; vImg.alt=venue.name;
    venueBox.style.display='block';
  }else venueBox.style.display='none';

  document.body.classList.add('modal-open');
  modal.style.display='flex';
}
closeBtn?.addEventListener('click',()=>{
  modal.style.display='none';
  document.body.classList.remove('modal-open');
});
window.addEventListener('click',e=>{
  if(e.target===modal){
    modal.style.display='none';
    document.body.classList.remove('modal-open');
  }
});

/* =========================================================
   7.  Swiper-слайдер
   ======================================================= */
document.addEventListener('DOMContentLoaded',()=>{
  if(document.querySelector('.mySwiper')){
    const sw=new Swiper('.mySwiper',{
      slidesPerView:3, spaceBetween:32, loop:true, speed:800,
      autoplay:{delay:2500,disableOnInteraction:false},
      pagination:{el:'.swiper-pagination',clickable:true},
      navigation:{nextEl:'.swiper-button-next',prevEl:'.swiper-button-prev'},
      breakpoints:{0:{slidesPerView:1.1},600:{slidesPerView:2},900:{slidesPerView:3}},
    });
    sw.on('click',s=>{
      const idx=s.clickedSlide?.dataset.index;
      if(idx!==undefined) openModal(events[idx]);
    });
  }
});

/* =========================================================
   8.  Burger-меню
   ======================================================= */
els.burger?.addEventListener('click',()=>els.mainNav.classList.toggle('menu-open'));
els.navMenu?.querySelectorAll('a').forEach(a=>
  a.addEventListener('click',()=>els.mainNav.classList.remove('menu-open')));

/* =========================================================
   9.  Каталог подій (events.html)
   ======================================================= */
function applyCatalogFilter(){
  const catSel=$('catCatalog'); if(!catSel) return;
  const locSel=$('locCatalog'), fromSel=$('fromCat'), toSel=$('toCat');

  const list=events.filter(ev=>{
    const okCat  =catSel.value==='all'||ev.type===catSel.value;
    const okLoc  =!locSel||locSel.value==='all'||String(ev.venueId)===locSel.value;
    const okFrom =!fromSel?.value||ev.date>=fromSel.value;
    const okTo   =!toSel?.value  ||ev.date<=toSel.value;
    return okCat&&okLoc&&okFrom&&okTo;
  });
  renderCatalog(list);
}
document.addEventListener('DOMContentLoaded',()=>{
  const locSel=$('locCatalog');
  if(locSel){
    locations.forEach(l=>{
      const opt=document.createElement('option');
      opt.value=l.id; opt.textContent=`📍 ${l.name}`; locSel.appendChild(opt);
    });
  }
  if(els.catalog){
    applyCatalogFilter();
    ['catCatalog','locCatalog','fromCat','toCat'].forEach(id=>
      $(id)?.addEventListener('change',applyCatalogFilter));
  }
});

/* =========================================================
  10.  Add-Event (форма на index.html)
   ======================================================= */
document.addEventListener('DOMContentLoaded',()=>{
  const form=$('addEventForm'); if(!form) return;

  const msg=$('formMsg'), venSel=$('evVenue');
  const pickBtn=$('pickCoordsBtn'), latInput=$('evLat'), lngInput=$('evLng');

  locations.forEach(l=>{
    const opt=document.createElement('option');
    opt.value=l.id; opt.textContent=l.name; venSel.appendChild(opt);
  });

  pickBtn?.addEventListener('click',()=>{
    pickMode=!pickMode;
    pickBtn.textContent=pickMode?'✅ Клікніть на карті':'📍 Обрати на карті';
    if(pickMode) alert('Клікніть на потрібну точку мапи, щоб вибрати координати.');
  });

  form.addEventListener('submit',e=>{
    e.preventDefault(); msg.textContent='';

    const venueId=Number(venSel.value);
    const venue=locations.find(v=>v.id===venueId);
    const lat=Number(latInput.value)||venue?.lat;
    const lng=Number(lngInput.value)||venue?.lng;
    if(!lat||!lng){ msg.textContent='⚠️ Оберіть координати на карті'; return; }

    const ev={
      _id:idSeed++,
      name:$('evName').value.trim(),
      description:$('evDesc').value.trim(),
      date:$('evDate').value,
      type:$('evType').value,
      lat,lng,
      image:$('evImg').value.trim()||'placeholder.jpg',
      venueId
    };
    if(Object.values(ev).some(v=>!v)){ msg.textContent='⚠️ Заповніть усі поля*'; return; }

    events.push(ev);
    const cache=JSON.parse(localStorage.getItem('userEvents')||'[]'); cache.push(ev);
    localStorage.setItem('userEvents',JSON.stringify(cache));

    renderEventList(events); renderMapMarkers(events); applyCatalogFilter();
    if(tempMarker){ map.removeLayer(tempMarker); tempMarker=null; }
    form.reset(); latInput.value=''; lngInput.value='';
    msg.textContent='✅ Подію додано!';
  });
});

/* =========================================================
  11.  Лічильники (count-up)
   ======================================================= */
document.addEventListener('DOMContentLoaded',()=>{
  const counters=[...document.querySelectorAll('.stat__num')];
  if(!counters.length) return;
  const ease=t=>(t<0.5?2*t*t:-1+(4-2*t)*t);
  const animate=(el,target)=>{
    const dur=1500,start=performance.now();
    const step=now=>{
      const p=Math.min((now-start)/dur,1);
      el.textContent=Math.floor(target*ease(p));
      if(p<1) requestAnimationFrame(step); else el.textContent=target;
    };
    requestAnimationFrame(step);
  };
  const io=new IntersectionObserver(entries=>{
    entries.forEach(ent=>{
      if(ent.isIntersecting){ animate(ent.target,Number(ent.target.dataset.target)||0);
        io.unobserve(ent.target); }
    });
  },{threshold:0.5});
  counters.forEach(c=>io.observe(c));
});
