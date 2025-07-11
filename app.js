/* =========================================================
   1.  ДАНІ (events + locations)
   ======================================================= */
const events = [
  {
    name: 'Концерт гурту XYZ',
    description: 'Великий концерт популярного гурту XYZ на площі Незалежності.',
    date: '2025-07-10',
    type: 'Музика',
    lat: 50.911, lng: 34.802,
    image: 'xyz-concert.png',
    link: 'events/event1.html',
    venueId: 4
  },
  {
    name: 'Кінопоказ просто неба',
    description: 'Вечірній кінопоказ у Центральному парку.',
    date: '2025-07-12',
    type: 'Кіно',
    lat: 50.905, lng: 34.7985,
    image: 'cinema-openair.jpg',
    link: 'events/event2.html',
    venueId: 2
  },
  {
    name: 'Виставка художників',
    description: 'Виставка сучасного живопису у міській галереї.',
    date: '2025-07-15',
    type: 'Виставка',
    lat: 50.9095, lng: 34.796,
    image: 'art-exhibition.jpg',
    link: 'events/event3.html',
    venueId: 3
  },
  {
    name: 'Відкрите тренування з йоги',
    description: 'Ранкове тренування з йоги у парку.',
    date: '2025-07-13',
    type: 'Спорт',
    lat: 50.908, lng: 34.803,
    image: 'yoga-training.jpg',
    link: 'events/event4.html',
    venueId: 2
  },
  {
    name: 'Лекція з історії міста',
    description: 'Пізнавальна лекція з історії міста у Молодіжному центрі.',
    date: '2025-07-14',
    type: 'Навчання',
    lat: 50.9105, lng: 34.795,
    image: 'history-lecture.jpg',
    link: 'events/event5.html',
    venueId: 1
  },
  {
    name: 'Міський фестиваль музики',
    description: 'Open-air фестиваль музики на міському стадіоні.',
    date: '2025-07-18',
    type: 'Музика',
    lat: 50.912, lng: 34.805,
    image: 'music-festival.jpg',
    link: 'events/event6.html',
    venueId: 5
  },
  {
    name: 'Вечір короткометражок',
    description: 'Перегляд короткометражних фільмів у Молодіжному центрі.',
    date: '2025-07-20',
    type: 'Кіно',
    lat: 50.9065, lng: 34.797,
    image: 'short-films.jpg',
    link: 'events/event7.html',
    venueId: 5
  },
  {
    name: 'Виставка фотографій',
    description: 'Фотовиставка сучасних авторів у міській галереї.',
    date: '2025-07-22',
    type: 'Виставка',
    lat: 50.9088, lng: 34.7995,
    image: 'photo-exhibition.jpg',
    link: 'events/event8.html',
    venueId: 3
  },
  {
    name: 'Змагання з бігу',
    description: 'Міські змагання з бігу у Центральному парку.',
    date: '2025-07-24',
    type: 'Спорт',
    lat: 50.903, lng: 34.8,
    image: 'running-competition.jpg',           // ← виправлено розширення
    link: 'events/event9.html',
    venueId: 2
  },
  {
    name: 'Майстер-клас з малювання',
    description: 'Майстер-клас з акварелі у Художній школі.',
    date: '2025-07-26',
    type: 'Навчання',
    lat: 50.909, lng: 34.804,
    image: 'art-masterclass.jpg',
    link: 'events/event10.html',
    venueId: 1
  }
];

const locations = [
  { id:1, name:'Площа Незалежності', address:'м. Суми, пл. Незалежності, 1',
    contact:'Тел: +380123456789',
    description:'Центральна площа міста для масових заходів.',
    image:'square.jpg' },
  { id:2, name:'Центральний парк', address:'м. Суми, вул. Паркова, 12',
    contact:'Тел: +380987654321',
    description:'Популярне місце для кіно просто неба.',
    image:'park.jpg' },
  { id:3, name:'Міська галерея', address:'м. Суми, вул. Мистецька, 5',
    contact:'Тел: +380555555555',
    description:'Галерея сучасного мистецтва.',
    image:'gallery.jpg' },
  { id:4, name:'Міський стадіон', address:'м. Суми, вул. Спортивна, 3',
    contact:'Тел: +380112233445',
    description:'Місце спортивних та музичних open-air подій.',
    image:'stadium.jpg' },
  { id:5, name:'Молодіжний центр', address:'м. Суми, вул. Молодіжна, 10',
    contact:'Тел: +380223344556',
    description:'Локація для лекцій і культурних подій.',
    image:'youth-center.jpg' }
];

/* =========================================================
   2.  КАРТА (Leaflet)
   ======================================================= */
const map = L.map('map').setView([50.907, 34.798], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'&copy; OpenStreetMap'
}).addTo(map);

let markers = [];

/* =========================================================
   3.  РЕНДЕР СПИСОК + МАРКЕРИ
   ======================================================= */
function renderEventList(arr){
  const list = document.getElementById('event-list');
  list.innerHTML = '';

  arr.forEach(ev=>{
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <img src="images/${ev.image}" alt="${ev.name}">
      <div class="event-details">
        <h3>${ev.name}</h3>
        <p>${ev.description}</p>
        <div class="event-meta">
          <span>📅 ${ev.date}</span>
          <span>📂 ${ev.type}</span>
        </div>
        <a class="detail-button" href="${ev.link}">Детальніше</a>
      </div>`;
    list.appendChild(card);
  });
}

function renderMapMarkers(arr){
  markers.forEach(m=>map.removeLayer(m));
  markers = [];

  arr.forEach(ev=>{
    const m = L.marker([ev.lat, ev.lng]).addTo(map)
               .bindPopup(`<b>${ev.name}</b><br>${ev.date}<br>${ev.type}`);
    m.on('click', ()=> openModal(ev));
    markers.push(m);
  });
}

/* первинний рендер */
renderEventList(events);
renderMapMarkers(events);

/* =========================================================
   4.  ФІЛЬТРИ + ПОШУК
   ======================================================= */
const searchInput = document.getElementById('searchInput');

function applyFilters(){
  const cat   = document.getElementById('category').value;
  const date  = document.getElementById('date').value;
  const q     = searchInput.value.trim().toLowerCase();

  const filtered = events.filter(ev=>{
    const okCat  = cat==='all' || ev.type === cat;
    const okDate = !date || ev.date === date;
    const okName = !q   || ev.name.toLowerCase().includes(q);
    return okCat && okDate && okName;
  });

  renderEventList(filtered);
  renderMapMarkers(filtered);
}

document.getElementById('filterButton')
        .addEventListener('click', e=>{
          e.preventDefault();
          applyFilters();
        });

document.getElementById('searchForm')
        .addEventListener('submit', e=>{
          e.preventDefault();
          const q = searchInput.value.trim().toLowerCase();
          if(!q){ applyFilters(); return; }
          const exact  = events.find(ev=>ev.name.toLowerCase()===q);
          const inside = events.find(ev=>ev.name.toLowerCase().includes(q));
          const target = exact || inside;
          if(target && target.link){
            window.location.href = target.link;
          }else{
            alert('На жаль, подію не знайдено 😕');
            applyFilters();
          }
        });

searchInput.addEventListener('input', applyFilters);

/* =========================================================
   5.  TOGGLE СПИСОК
   ======================================================= */
const toggleHdr = document.getElementById('toggle-event-list');
const eventDiv  = document.getElementById('event-list');
toggleHdr.addEventListener('click', ()=>{
  eventDiv.classList.toggle('active');
  toggleHdr.textContent = eventDiv.classList.contains('active')
      ? 'Список подій ▲' : 'Список подій ▼';
});

/* =========================================================
   6.  MODAL
   ======================================================= */
const modal      = document.getElementById('eventModal');
const modalTitle = document.getElementById('modal-title');
const modalImg   = document.getElementById('modal-image');
const modalDesc  = document.getElementById('modal-description');
const modalDate  = document.getElementById('modal-date');
const modalType  = document.getElementById('modal-type');
const closeBtn   = document.querySelector('.close-button');

const venueBox = document.getElementById('venue-info');
const vName  = document.getElementById('modal-venue-name');
const vAddr  = document.getElementById('modal-venue-address');
const vCont  = document.getElementById('modal-venue-contact');
const vDes   = document.getElementById('modal-venue-description');
const vImg   = document.getElementById('modal-venue-image');

function openModal(ev){
  modalTitle.textContent = ev.name;
  modalImg.src  = `images/${ev.image}`;
  modalImg.alt  = ev.name;
  modalDesc.textContent = ev.description;
  modalDate.textContent = `📅 Дата: ${ev.date}`;
  modalType.textContent = `📂 Категорія: ${ev.type}`;

  const venue = locations.find(l => l.id === ev.venueId);
  if (venue){
    vName.textContent  = `🏛 Заклад: ${venue.name}`;
    vAddr.textContent  = `📍 Адреса: ${venue.address}`;
    vCont.textContent  = `📞 Контакт: ${venue.contact}`;
    vDes.textContent   = `ℹ️ ${venue.description}`;
    vImg.src = `images/${venue.image}`;
    vImg.alt = venue.name;
    venueBox.style.display = 'block';
  }else{
    venueBox.style.display = 'none';
  }

  document.body.classList.add('modal-open');   // ← ховаємо елементи Leaflet
  modal.style.display = 'flex';
}

/* --- закриття модалки --- */
closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');
});
window.addEventListener('click', (e) => {
  if (e.target === modal){
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
});


/* =========================================================
   7.  SWIPER
   ======================================================= */
document.addEventListener('DOMContentLoaded', ()=>{
  const swiper = new Swiper('.mySwiper',{
    slidesPerView:3,
    spaceBetween:32,
    loop:true,
    speed:800,
    autoplay:{delay:2500, disableOnInteraction:false},
    pagination:{el:'.swiper-pagination', clickable:true},
    navigation:{nextEl:'.swiper-button-next', prevEl:'.swiper-button-prev'},
    breakpoints:{0:{slidesPerView:1.1},600:{slidesPerView:2},900:{slidesPerView:3}}
  });
  swiper.on('click', sw=>{
    const idx = sw.clickedSlide?.dataset.index;
    if(idx!==undefined) openModal(events[idx]);
  });
});

/* =========================================================
   8.  BURGER-МЕНЮ
   ======================================================= */
const burgerBtn = document.getElementById('burger');
const navMenu   = document.querySelector('.nav-menu');
const mainNav   = document.querySelector('.main-nav');

burgerBtn?.addEventListener('click', ()=> mainNav.classList.toggle('menu-open'));
navMenu?.querySelectorAll('a').forEach(link=>{
  link.addEventListener('click', ()=> mainNav.classList.remove('menu-open'));
});
