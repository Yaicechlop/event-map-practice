'use strict';

const getEl = (id) => document.getElementById(id);
const $ = getEl;

window.events = [];
window.locations = [];

const getImgPath = (imgName) => {
    if (!imgName || imgName === 'placeholder.jpg') return 'images/placeholder.jpg';
    if (imgName.startsWith('http') || imgName.startsWith('data:')) return imgName;
    return `http://localhost:5000/images/${imgName}`;
};

/* =========================================================
   1. МОДАЛЬНІ ВІКНА ТА АВТОРИЗАЦІЯ
   ========================================================= */
window.openAuthModal = (e) => {
    if (e) e.preventDefault();
    const modal = $('authModal');
    if (modal) modal.style.display = 'flex';
};
window.closeAuthModal = () => {
    const modal = $('authModal');
    if (modal) modal.style.display = 'none';
};
window.switchAuthMode = (mode) => {
    const l = $('loginBlock'), r = $('registerBlock');
    if (mode === 'register') {
        if (l) l.style.display = 'none';
        if (r) r.style.display = 'block';
    } else {
        if (r) r.style.display = 'none';
        if (l) l.style.display = 'block';
    }
};
window.onclick = (event) => {
    if (event.target === $('authModal')) closeAuthModal();
};

async function handleRegister(e) {
    e.preventDefault();
    const username = $('regName')?.value, email = $('regEmail')?.value, password = $('regPass')?.value, role = $('regRole')?.value || 'user';
    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, role })
        });
        const data = await res.json();
        if (res.ok) { alert("Реєстрація успішна! Увійдіть у свій акаунт."); e.target.reset(); switchAuthMode('login'); }
        else alert(data.error || "Помилка реєстрації");
    } catch (err) { console.error(err); }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = $('loginEmail')?.value, password = $('loginPass')?.value;
    try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); window.location.reload();
        } else alert(data.error || "Помилка входу");
    } catch (err) { console.error(err); }
}

window.handleLogout = (e) => {
    if (e) e.preventDefault();
    localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.reload();
};

function checkAuthStatus() {
    const user = JSON.parse(localStorage.getItem('user'));
    const authContainer = $('authButtons');
    if (authContainer) {
        if (user) {
            authContainer.innerHTML = `
                <a href="profile.html" class="user-badge" style="color: #fff; margin-right: 15px; text-decoration: none; cursor: pointer; transition: 0.3s;" onmouseover="this.style.color='var(--accent-yellow)'" onmouseout="this.style.color='#fff'">
                    👤 ${user.username}
                </a>
                <a href="#" onclick="handleLogout(event)" class="nav-gradient-link">Вийти</a>
            `;
        } else {
            authContainer.innerHTML = `<a href="#" onclick="openAuthModal(event)" class="nav-gradient-link">УВІЙТИ</a>`;
        }
    }
    if ($('reviewFormContainer')) $('reviewFormContainer').style.display = user ? 'block' : 'none';
    if ($('loginPrompt')) $('loginPrompt').style.display = user ? 'none' : 'block';
    const canAdd = user && (user.role === 'organizer' || user.role === 'admin');
    if ($('add-event')) $('add-event').style.display = canAdd ? 'block' : 'none';
}

/* =========================================================
   2. ЗАВАНТАЖЕННЯ ДАНИХ (КАТАЛОГ, ФІЛЬТРИ)
   ========================================================= */
async function initAppData() {
    try {
        const [locRes, evRes] = await Promise.all([
            fetch('http://localhost:5000/api/locations'),
            fetch('http://localhost:5000/api/events')
        ]);
        window.locations = await locRes.json();
        window.events = await evRes.json();

        fillLocationSelects();

        // НОВЕ: АВТОФІЛЬТР ПО ЗАКЛАДУ! Якщо в адресі є ?venue=1, обираємо цей заклад
        const urlParams = new URLSearchParams(window.location.search);
        const venueParam = urlParams.get('venue');
        if (venueParam && $('locCatalog')) {
            $('locCatalog').value = venueParam;
        }

        applyFilters();
        loadTopEvents();
        loadTopRatedEvents();
        renderVenues(); // НОВЕ: Малюємо заклади
    } catch (err) {
        console.error("Помилка завантаження даних:", err);
        if ($('events-catalog')) $('events-catalog').innerHTML = '<p class="empty-state">Помилка підключення до сервера.</p>';
    }
}

function fillLocationSelects() {
    const selects = document.querySelectorAll('#venue, #evVenue, #locCatalog');
    selects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = select.id === 'evVenue' ? '<option value="">– нове місце (з пошуку) –</option>' : '<option value="all">Усі локації</option>';
        window.locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.id; opt.textContent = loc.name;
            select.appendChild(opt);
        });
        select.value = currentVal;
    });
}

function applyFilters() {
    if (!window.events) return;
    const cat = $('category')?.value || $('catCatalog')?.value || 'all';
    const ven = $('venue')?.value || $('locCatalog')?.value || 'all';
    const query = ($('searchInput')?.value || '').toLowerCase().trim();
    const from = $('fromCat')?.value || '';
    const to = $('toCat')?.value || '';

    const filtered = window.events.filter(ev => {
        const okCat = cat === 'all' || ev.type === cat;
        const okVen = ven === 'all' || String(ev.venueId) === ven;
        const okSearch = !query || ev.name.toLowerCase().includes(query) || (ev.description && ev.description.toLowerCase().includes(query));
        const evDate = ev.date ? new Date(ev.date).toISOString().split('T')[0] : '';
        const okFrom = !from || evDate >= from;
        const okTo = !to || evDate <= to;
        return okCat && okVen && okSearch && okFrom && okTo;
    });

    if ($('event-list')) renderEventList(filtered, 'event-list');
    if ($('events-catalog')) renderEventList(filtered, 'events-catalog');
    if (typeof renderMapMarkers === 'function' && window.cGrp) renderMapMarkers(filtered);
}

function renderEventList(arr, containerId) {
    const container = $(containerId);
    if (!container) return;
    container.innerHTML = arr.length ? '' : '<p class="empty-state" style="grid-column: 1/-1; text-align: center;">Подій не знайдено 😕</p>';
    arr.forEach(ev => container.appendChild(createCard(ev, containerId === 'events-catalog')));
}

function createCard(ev, isCatalog = false) {
    const currentId = ev.id || ev.ID;
    const el = document.createElement('div');
    el.className = isCatalog ? 'catalog-card' : 'event-card';
    const imgSrc = ev.display_image || ev.image;

    el.innerHTML = `
        <img src="${getImgPath(imgSrc)}" alt="${ev.name}" onerror="this.src='images/placeholder.jpg'">
        <div class="event-details">
            <span class="badge">${ev.type}</span>
            <h3>${ev.name}</h3>
            <p>📅 ${new Date(ev.date).toLocaleDateString('uk-UA')}</p>
            <a class="submit-btn detail-button" href="./place.html?id=${currentId}">Детальніше</a>
        </div>`;

    const btn = el.querySelector('.detail-button');
    if (btn) btn.onclick = () => sessionStorage.setItem('currentEventId', currentId);
    return el;
}

/* =========================================================
   3. ТОПИ, РЕЙТИНГИ ТА ЗАКЛАДИ
   ========================================================= */
async function loadTopEvents() {
    const container = $('topEventsContainer');
    if (!container) return;
    const topEvents = [...window.events].filter(ev => new Date(ev.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
    container.innerHTML = '';
    if (topEvents.length === 0) return container.innerHTML = '<p class="empty-state">Найближчих подій поки немає</p>';

    topEvents.forEach(ev => {
        const card = document.createElement('div'); card.className = 'top-card';
        card.onclick = () => { sessionStorage.setItem('currentEventId', ev.id); window.location.href = `./place.html?id=${ev.id}`; };
        card.innerHTML = `
            <img src="${getImgPath(ev.display_image || ev.image)}" alt="${ev.name}" onerror="this.src='images/placeholder.jpg'">
            <div class="top-card-overlay">
                <span class="top-card-type">${ev.type}</span><h3>${ev.name}</h3>
                <div class="top-card-date">📅 ${new Date(ev.date).toLocaleDateString('uk-UA')}</div>
            </div>`;
        container.appendChild(card);
    });
}

async function loadTopRatedEvents() {
    const container = $('topRatedContainer');
    if (!container) return;
    try {
        const res = await fetch('http://localhost:5000/api/events/top');
        const topEvents = await res.json();
        container.innerHTML = '';
        if (topEvents.length === 0) return container.innerHTML = '<p class="empty-state">Поки немає оцінених подій.</p>';

        topEvents.forEach((ev, index) => {
            const card = document.createElement('a');
            card.href = `./place.html?id=${ev.id}`; card.className = 'top-card';
            card.onclick = () => sessionStorage.setItem('currentEventId', ev.id);
            const rating = parseFloat(ev.avg_rating).toFixed(1);
            const ratingHtml = ev.review_count > 0 ? `<span style="color: gold;">★ ${rating}</span> <span style="font-size: 0.9rem; color: #ccc;">(${ev.review_count})</span>` : `<span>Немає оцінок</span>`;
            card.innerHTML = `
                <span class="top-badge">${index + 1}</span>
                <img src="${getImgPath(ev.display_image || ev.image)}" alt="${ev.name}" onerror="this.src='images/placeholder.jpg'">
                <span class="top-caption" style="display: flex; flex-direction: column; gap: 5px;">
                    <strong>${ev.name}</strong><div>${ratingHtml}</div>
                </span>`;
            container.appendChild(card);
        });
    } catch (err) { console.error(err); }
}

// НОВЕ: ФУНКЦІЯ МАЛЮВАННЯ КАРТОК ЗАКЛАДІВ
function renderVenues() {
    const container = $('venues-catalog');
    if (!container) return;

    container.innerHTML = window.locations.length ? '' : '<p class="empty-state" style="grid-column: 1/-1; text-align: center;">Закладів поки немає 😕</p>';

    window.locations.forEach(loc => {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        const imgSrc = getImgPath(loc.image || 'placeholder.jpg');

        // Рахуємо кількість подій у цьому закладі
        const eventsCount = window.events.filter(ev => String(ev.venueId) === String(loc.id)).length;

        card.innerHTML = `
            <img src="${imgSrc}" alt="${loc.name}" onerror="this.src='images/placeholder.jpg'">
            <div class="event-details">
                <h3>${loc.name}</h3>
                <p style="color: var(--text-dim); font-size: 14px; margin-bottom: 5px;"><i class="fa-solid fa-location-dot"></i> ${loc.address || 'Адреса не вказана'}</p>
                <p style="font-weight: bold; color: var(--accent-yellow); margin-bottom: 15px;">Подій: ${eventsCount}</p>
                <a class="submit-btn detail-button" href="events.html?venue=${loc.id}">Переглянути події</a>
            </div>`;
        container.appendChild(card);
    });
}

/* =========================================================
   4. ДЕТАЛІ ОДНІЄЇ ПОДІЇ (PLACE.HTML)
   ========================================================= */
async function loadSingleEvent() {
    if (!$('evTitle')) return;

    let eventId = sessionStorage.getItem('currentEventId') || new URLSearchParams(window.location.search).get('id');
    if (!eventId || eventId === 'null') return alert("Подію не знайдено");

    if ($('reviewEventId')) $('reviewEventId').value = eventId;

    try {
        const res = await fetch(`http://localhost:5000/api/events/${eventId}`);
        if (!res.ok) throw new Error("Помилка сервера");
        const event = await res.json();

        document.title = `${event.name} • PodiySumy`;
        if ($('evTitle')) $('evTitle').textContent = event.name;
        if ($('evDesc')) $('evDesc').textContent = event.description || "Опис...";
        if ($('evType')) $('evType').textContent = event.type;
        if ($('evDate')) $('evDate').textContent = new Date(event.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

        const img = $('placeImg');
        if (img) {
            let imgSrc = event.final_image || event.image || event.link;
            if (imgSrc && imgSrc !== 'null') img.src = getImgPath(imgSrc);
            img.onerror = () => img.src = 'images/placeholder.jpg';
        }

        if ($('locName')) $('locName').textContent = event.location_name || event.address || "Уточнюється";
        if ($('locContacts')) $('locContacts').textContent = event.location_contacts || "Немає";

        if (event.lat && event.lng) initSingleMap(event.lat, event.lng, event.name, event.type);
        else if ($('mapSingle')) $('mapSingle').parentElement.style.display = 'none';

        loadReviews(eventId);

        const token = localStorage.getItem('token');
        if (token) {
            const favRes = await fetch(`http://localhost:5000/api/favorites/check/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (favRes.ok) {
                const favData = await favRes.json();
                if ($('favBtn') && favData.isFavorite) $('favBtn').innerHTML = '<i class="fa-solid fa-heart"></i>';
            }
        }
    } catch (err) { console.error(err); }
}

function initSingleMap(lat, lng, title, type) {
    if (!window.L || !$('mapSingle')) return;
    const map = L.map('mapSingle', { scrollWheelZoom: false }).setView([lat, lng], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    const icons = { 'Музика': 'fa-music', 'Кіно': 'fa-film', 'Виставка': 'fa-paintbrush', 'Спорт': 'fa-person-running', 'Навчання': 'fa-book-open' };
    const classes = { 'Музика': 'music', 'Кіно': 'cinema', 'Виставка': 'art', 'Спорт': 'sport', 'Навчання': 'study' };
    const customIcon = L.divIcon({ className: `marker-custom ${classes[type] || 'default'}`, html: `<i class="fa-solid ${icons[type] || 'fa-map-pin'}"></i>`, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -34] });
    L.marker([lat, lng], { icon: customIcon }).addTo(map).bindPopup(`<b>${title}</b>`).openPopup();
}

// ВІДГУКИ ТА ШЕРИНГ
async function submitReview(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert("Увійдіть знову.");
    const event_id = $('reviewEventId').value, comment = $('reviewComment').value, ratingEl = document.querySelector('input[name="rating"]:checked');
    if (!ratingEl) return alert("Оберіть зірки!");
    try {
        const res = await fetch('http://localhost:5000/api/reviews', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ event_id, rating: ratingEl.value, comment })
        });
        if (res.ok) { alert("Відгук збережено ⭐️"); window.location.reload(); }
        else alert((await res.json()).error);
    } catch (err) { console.error(err); }
}

async function loadReviews(eventId) {
    if (!$('reviewsList')) return;
    try {
        const res = await fetch(`http://localhost:5000/api/reviews/${eventId}`);
        const reviews = await res.json();
        if (reviews.length === 0) return $('reviewsList').innerHTML = '<p style="color: var(--text-dim);">Ще немає відгуків. Будьте першим!</p>';
        $('reviewsList').innerHTML = reviews.map(r => `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #fff; font-size: 15px;">👤 ${r.username}</strong>
                    <span style="color: gold; letter-spacing: 2px;">${'★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)}</span>
                </div>
                <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 14px;">${r.comment}</p>
            </div>`).join('');
    } catch (err) { console.error(err); }
}

window.toggleFavorite = async () => {
    const token = localStorage.getItem('token');
    if (!token) return openAuthModal();
    const eventId = $('reviewEventId')?.value;
    if (!eventId) return;
    try {
        const res = await fetch('http://localhost:5000/api/favorites/toggle', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ event_id: eventId })
        });
        const data = await res.json();
        if ($('favBtn')) $('favBtn').innerHTML = data.isFavorite ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
    } catch (err) { console.error(err); }
};

window.shareEvent = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: document.title, text: 'Дивись, що я знайшов:', url }).catch(console.error);
    else { navigator.clipboard.writeText(url); alert("Посилання скопійовано!"); }
};

/* =========================================================
   5. ЗАПУСК ДОДАТКУ (СЛУХАЧІ)
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    initAppData(); // Каталог і Глобальні дані
    loadSingleEvent(); // Дані однієї події (якщо на сторінці place.html)

    $('registerForm')?.addEventListener('submit', handleRegister);
    $('loginForm')?.addEventListener('submit', handleLogin);
    $('reviewForm')?.addEventListener('submit', submitReview);
    $('searchInput')?.addEventListener('input', applyFilters);
    ['category', 'catCatalog', 'venue', 'locCatalog', 'fromCat', 'toCat'].forEach(id => $(id)?.addEventListener('change', applyFilters));
});