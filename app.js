/* =========================================================
   0.  DOM-довідник
   ======================================================= */
const $ = id => document.getElementById(id);
const els = {
  mapBox:   $('map'),
  list:     $('event-list'),
  catalog:  $('events-catalog'),
  search:   $('searchInput'),
  burger:   $('burger'),
  mainNav:  document.querySelector('.main-nav'),
  navMenu:  document.querySelector('.nav-menu'),
  toggleHdr:$('toggle-event-list')
};

/* =========================================================
   1.  ДАНІ
   ======================================================= */
const events = [
  { name:'Концерт гурту XYZ',  description:'Великий концерт популярного гурту XYZ на площі Незалежності.', date:'2025-07-10', type:'Музика',  lat:50.911,  lng:34.802, image:'xyz-concert.png',       link:'events/event1.html',  venueId:4 },
  { name:'Кінопоказ просто неба', description:'Вечірній кінопоказ у Центральному парку.', date:'2025-07-12', type:'Кіно',     lat:50.905,  lng:34.7985,image:'cinema-openair.jpg',   link:'events/event2.html',  venueId:2 },
  { name:'Виставка художників',   description:'Виставка сучасного живопису у міській галереї.', date:'2025-07-15', type:'Виставка',lat:50.9095,lng:34.796, image:'art-exhibition.jpg',    link:'events/event3.html',  venueId:3 },
  { name:'Відкрите тренування з йоги', description:'Ранкове тренування з йоги у парку.', date:'2025-07-13', type:'Спорт',    lat:50.908,  lng:34.803, image:'yoga-training.jpg',     link:'events/event4.html',  venueId:2 },
  { name:'Лекція з історії міста', description:'Пізнавальна лекція з історії міста у Молодіжному центрі.', date:'2025-07-14', type:'Навчання',lat:50.9105,lng:34.795, image:'history-lecture.jpg',   link:'events/event5.html',  venueId:1 },
  { name:'Міський фестиваль музики', description:'Open-air фестиваль музики на міському стадіоні.', date:'2025-07-18', type:'Музика',  lat:50.912,  lng:34.805, image:'music-festival.jpg',    link:'events/event6.html',  venueId:4 },
  { name:'Вечір короткометражок', description:'Перегляд короткометражних фільмів у Молодіжному центрі.', date:'2025-07-20', type:'Кіно',     lat:50.9065,lng:34.797, image:'short-films.jpg',        link:'events/event7.html',  venueId:5 },
  { name:'Виставка фотографій',  description:'Фотовиставка сучасних авторів у міській галереї.', date:'2025-07-22', type:'Виставка',lat:50.9088,lng:34.7995,image:'photo-exhibition.jpg',  link:'events/event8.html',  venueId:3 },
  { name:'Змагання з бігу',      description:'Міські змагання з бігу у Центральному парку.', date:'2025-07-24', type:'Спорт',    lat:50.903,  lng:34.8,   image:'running-competition.jpg',link:'events/event9.html',  venueId:2 },
  { name:'Майстер-клас з малювання', description:'Майстер-клас з акварелі у Художній школі.', date:'2025-07-26', type:'Навчання',lat:50.909,  lng:34.804, image:'art-masterclass.jpg',   link:'events/event10.html', venueId:1 }
];
const locations = [
  { id:1, name:'Площа Незалежності', address:'м. Суми, пл. Незалежності, 1', contact:'+380 12 345 67 89', description:'Центральна площа міста для масових заходів.', image:'square.jpg' },
  { id:2, name:'Центральний парк',    address:'м. Суми, вул. Паркова, 12',   contact:'+380 98 765 43 21', description:'Популярне місце для кінопоказів просто неба.', image:'park.jpg' },
  { id:3, name:'Міська галерея',      address:'м. Суми, вул. Мистецька, 5',  contact:'+380 55 555 55 55', description:'Галерея сучасного мистецтва.',                 image:'art-school.jpg' },
  { id:4, name:'Міський стадіон',     address:'м. Суми, вул. Спортивна, 3',  contact:'+380 11 223 34 45', description:'Місце спортивних та музичних open-air подій.',  image:'stadium.jpg' },
  { id:5, name:'Молодіжний центр',    address:'м. Суми, вул. Молодіжна, 10', contact:'+380 22 334 45 56', description:'Локація для лекцій і культурних подій.',         image:'youth-center.jpg' }
];

window.events = events;
window.locations = locations;

/* =========================================================
   2.  КАРТА (Leaflet)
   ======================================================= */
let map = null;
let markers = [];

if (els.mapBox && window.L){
  map = L.map(els.mapBox).setView([50.907,34.798],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              {attribution:'© OpenStreetMap'}).addTo(map);
}

/* ── колір маркера за категорією ── */
const typeClass = t => ({
  'Музика':'music','Кіно':'cinema','Виставка':'art','Спорт':'sport','Навчання':'study'
}[t]||'default');

const markerIcon = t => L.divIcon({
  className:`marker ${typeClass(t)}`,
  iconSize:[22,22], popupAnchor:[0,-10]
});

/* =========================================================
   3.  Картки + рендери
   ======================================================= */
const createCard = (ev, cat = false) => {
  const el = document.createElement(cat ? 'a' : 'div');
  el.className = cat ? 'catalog-card' : 'event-card';
  if (cat) el.href = ev.link;

  /* added loading="lazy" для всіх зображень картки */
  el.innerHTML = `
    <img src="images/${ev.image}" alt="${ev.name}" loading="lazy">
    <div class="${cat ? 'inner' : 'event-details'}">
      <h3>${ev.name}</h3>
      ${cat ? '' : `<p>${ev.description}</p>`}
      <p class="${cat ? 'meta' : 'event-meta'}">
        <span>📅 ${ev.date}</span> <span>📂 ${ev.type}</span>
      </p>
      ${
        cat
          ? `<p class="catalog-desc">${ev.description}</p>`
          : `<a class="detail-button" href="${ev.link}">Детальніше</a>`
      }
    </div>`;
  return el;
};

function renderEventList(arr) {
  if (!els.list) return;
  els.list.innerHTML = arr.length
    ? arr.map(ev => createCard(ev).outerHTML).join('')
    : '<p class="empty-state">😔 Подій не знайдено</p>';

  if (arr.length)
    arr.forEach((ev, i) =>
      els.list.children[i].replaceWith(createCard(ev))
    );
}

function renderCatalog(arr) {
  if (!els.catalog) return;
  els.catalog.innerHTML = arr.length
    ? arr.map(ev => createCard(ev, true).outerHTML).join('')
    : '<p class="empty-state">😕 За вибраними фільтрами подій немає</p>';

  if (arr.length)
    arr.forEach((ev, i) =>
      els.catalog.children[i].replaceWith(createCard(ev, true))
    );
}

function renderMapMarkers(arr) {
  if (!map) return;
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  arr.forEach(ev => {
    const m = L.marker([ev.lat, ev.lng], { icon: markerIcon(ev.type) })
      .addTo(map)
      .bindPopup(`<b>${ev.name}</b><br>${ev.date}<br>${ev.type}`);
    m.on('click', () => openModal(ev));
    markers.push(m);
  });
}

/* первинний рендер */
renderEventList(events);
renderMapMarkers(events);

/* =========================================================
   4.  Фільтри + пошук
   ======================================================= */
const applyFilters = ()=>{
  const cat=$('category')?.value??'all';
  const ven=$('venue')?.value??'all';
  const from=$('from')?.value??'';
  const to=$('to')?.value??'';
  const q=(els.search?.value||'').trim().toLowerCase();

  const list=events.filter(ev=>{
    const okCat=cat==='all'||ev.type===cat;
    const okVen=ven==='all'||ev.venueId==ven;
    const okFrom=!from||ev.date>=from;
    const okTo=!to||ev.date<=to;
    const okName=!q||ev.name.toLowerCase().includes(q);
    return okCat&&okVen&&okFrom&&okTo&&okName;
  });
  renderEventList(list); renderMapMarkers(list);
};

['category','venue','from','to'].forEach(id=>$(id)?.addEventListener('change',applyFilters));
$('filterButton')?.addEventListener('click',e=>{e.preventDefault();applyFilters();});
els.search?.addEventListener('input',applyFilters);

/* автозаповнення локацій */
document.addEventListener('DOMContentLoaded',()=>{
  const vSel=$('venue');
  if(vSel) locations.forEach(l=>{
    const o=document.createElement('option');
    o.value=l.id; o.textContent='📍 '+l.name; vSel.appendChild(o);
  });
});

/* =========================================================
   5.  TOGGLE список
   ======================================================= */
els.toggleHdr?.addEventListener('click',()=>{
  els.list.classList.toggle('active');
  els.toggleHdr.textContent=els.list.classList.contains('active')
    ? 'Список подій ▲' : 'Список подій ▼';
});

/* =========================================================
   6.  MODAL
   ======================================================= */
const modal      = $('eventModal');
const modalTitle = $('modal-title');
const modalImg   = $('modal-image');
const modalDesc  = $('modal-description');
const modalDate  = $('modal-date');
const modalType  = $('modal-type');
const closeBtn   = document.querySelector('.close-button');

const venueBox = $('venue-info');
const vName  = $('modal-venue-name');
const vAddr  = $('modal-venue-address');
const vCont  = $('modal-venue-contact');
const vDes   = $('modal-venue-description');
const vImg   = $('modal-venue-image');

function openModal(ev){
  modalTitle.textContent=ev.name;
  modalImg.src=`images/${ev.image}`; modalImg.alt=ev.name;
  modalDesc.textContent=ev.description;
  modalDate.textContent=`📅 Дата: ${ev.date}`;
  modalType.textContent=`📂 Категорія: ${ev.type}`;

  const venue=locations.find(l=>l.id===ev.venueId);
  if(venue){
    vName.textContent=`🏛 Заклад: ${venue.name}`;
    vAddr.textContent=`📍 Адреса: ${venue.address}`;
    vCont.textContent=`📞 Контакт: ${venue.contact}`;
    vDes.textContent=`ℹ️ ${venue.description}`;
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
   7.  SWIPER
   ======================================================= */
document.addEventListener('DOMContentLoaded',()=>{
  if(document.querySelector('.mySwiper')){
    const sw=new Swiper('.mySwiper',{
      slidesPerView:3,spaceBetween:32,loop:true,speed:800,
      autoplay:{delay:2500,disableOnInteraction:false},
      pagination:{el:'.swiper-pagination',clickable:true},
      navigation:{nextEl:'.swiper-button-next',prevEl:'.swiper-button-prev'},
      breakpoints:{0:{slidesPerView:1.1},600:{slidesPerView:2},900:{slidesPerView:3}}
    });
    sw.on('click',s=>{
      const idx=s.clickedSlide?.dataset.index;
      if(idx!==undefined) openModal(events[idx]);
    });
  }
});

/* =========================================================
   8.  BURGER-меню
   ======================================================= */
els.burger?.addEventListener('click',()=>els.mainNav.classList.toggle('menu-open'));
els.navMenu?.querySelectorAll('a').forEach(a=>{
  a.addEventListener('click',()=>els.mainNav.classList.remove('menu-open'));
});

/* =========================================================
   9.  КАТАЛОГ (events.html)
   ======================================================= */
function applyCatalogFilter(){
  const catSel=$('catCatalog'); const locSel=$('locCatalog');
  const fromSel=$('fromCat');   const toSel=$('toCat');
  if(!catSel) return;

  const list=events.filter(ev=>{
    const okCat=catSel.value==='all'||ev.type===catSel.value;
    const okLoc=!locSel||locSel.value==='all'||ev.venueId==locSel.value;
    const okFrom=!fromSel?.value||ev.date>=fromSel.value;
    const okTo=!toSel?.value||ev.date<=toSel.value;
    return okCat&&okLoc&&okFrom&&okTo;
  });
  renderCatalog(list);
}

document.addEventListener('DOMContentLoaded',()=>{
  const locSel=$('locCatalog');
  if(locSel) locations.forEach(l=>{
    const o=document.createElement('option');
    o.value=l.id; o.textContent='📍 '+l.name; locSel.appendChild(o);
  });
  if(els.catalog){
    applyCatalogFilter();
    ['catCatalog','locCatalog','fromCat','toCat']
      .forEach(id=>$(id)?.addEventListener('change',applyCatalogFilter));
  }
});
/* =========================================================
   10.  Додати подію  (координати беруться з вибраної локації)
   ======================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const form   = $('addEventForm');
  if (!form) return;

  const msg    = $('formMsg');
  const venSel = $('evVenue');

  /* ---- 1. заповнюємо селект локацій ---- */
  locations.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = l.name;
    venSel.appendChild(opt);
  });

  /* ---- 2. підвантажуємо кеш із localStorage ---- */
  const cached = JSON.parse(localStorage.getItem('userEvents') || '[]');
  if (cached.length) {
    events.push(...cached);
    renderEventList(events);
    renderMapMarkers(events);
  }

  /* ---- 3. сабміт форми ---- */
  form.addEventListener('submit', e => {
    e.preventDefault();
    msg.textContent = '';

    const venueId = +venSel.value;
    const venue   = locations.find(v => v.id === venueId);

    if (!venue) {
      msg.textContent = '⚠️ Оберіть локацію';
      return;
    }
    if (!venue.lat || !venue.lng) {
      msg.textContent = '⚠️ Для цієї локації не задані координати';
      return;
    }

    const ev = {
      name:        $('#evName').value.trim(),
      description: $('#evDesc').value.trim(),
      date:        $('#evDate').value,
      type:        $('#evType').value,
      lat:         venue.lat,
      lng:         venue.lng,
      image:       $('#evImg').value.trim() || 'placeholder.jpg',
      link:        '#',
      venueId
    };

    if (Object.values(ev).some(v => !v)) {
      msg.textContent = '⚠️ Заповніть усі обовʼязкові поля*';
      return;
    }

    /* локально додаємо та кешуємо */
    events.push(ev);
    cached.push(ev);
    localStorage.setItem('userEvents', JSON.stringify(cached));

    renderEventList(events);
    renderMapMarkers(events);

    form.reset();
    msg.textContent = '✅ Подію додано!';
  });
});
/* =========================================================
   11.  Count-Up статистика
   ======================================================= */
document.addEventListener('DOMContentLoaded', () => {
  const counters = [...document.querySelectorAll('.stat__num')];
  if (!counters.length) return;

  /* квадратична easeInOut */
  const ease = t => (t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

  const animate = (el, target) => {
    const dur = 1500;                   // 1.5 c
    const start = performance.now();

    const step = now => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.floor(target * ease(p));
      if (p < 1) requestAnimationFrame(step);
      else       el.textContent = target; // фінальне число
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(ent => {
      if (ent.isIntersecting) {
        const target = +ent.target.dataset.target || 0;
        animate(ent.target, target);
        io.unobserve(ent.target);       // анімуємо лише один раз
      }
    });
  }, { threshold: .5 });                // 50 % блоку у вікні

  counters.forEach(c => io.observe(c));
});
