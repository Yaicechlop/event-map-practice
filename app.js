'use strict';

// 1. Помічники та ініціалізація
const $ = (id) => document.getElementById(id);
window.events = [];
window.locations = [];

// Функція для визначення шляху до картинки (локальна чи URL)
const getImgPath = (imgName) => {
    if (!imgName || imgName === 'placeholder.jpg') return 'images/placeholder.jpg';
    if (imgName.startsWith('http') || imgName.startsWith('data:')) return imgName;
    // Використовуємо localhost, як ти і просив
    return `http://localhost:5000/images/${imgName}`;
};

// --- КЕРУВАННЯ МОДАЛЬНИМ ВІКНОМ АВТОРИЗАЦІЇ ---

window.openAuthModal = function (e) {
    if (e) e.preventDefault();
    const modal = $('authModal');
    if (modal) modal.style.display = 'flex';
};

window.closeAuthModal = function () {
    const modal = $('authModal');
    if (modal) modal.style.display = 'none';
};

window.switchAuthMode = function (mode) {
    const loginBlock = $('loginBlock');
    const registerBlock = $('registerBlock');

    if (mode === 'register') {
        if (loginBlock) loginBlock.style.display = 'none';
        if (registerBlock) registerBlock.style.display = 'block';
    } else {
        if (registerBlock) registerBlock.style.display = 'none';
        if (loginBlock) loginBlock.style.display = 'block';
    }
};

// Закриття по кліку поза вікном
window.onclick = function (event) {
    const modal = $('authModal');
    if (event.target === modal) {
        closeAuthModal();
    }
};

// --- АВТОРИЗАЦІЯ ТА РОЛІ ---

// Перевірка прав користувача та оновлення інтерфейсу
function checkPermissions() {
    const user = JSON.parse(localStorage.getItem('user'));

    // Шукаємо секцію форми та саму форму
    const addEventSection = $('add-event');
    const addEventForm = $('addEventForm');

    // Якщо користувач авторизований І він організатор/адмін — показуємо форму
    const canAddEvent = user && (user.role === 'organizer' || user.role === 'admin');

    if (addEventSection) addEventSection.style.display = canAddEvent ? 'block' : 'none';
    if (addEventForm && !addEventSection) addEventForm.style.display = canAddEvent ? 'flex' : 'none';

    // Оновлення кнопок авторизації в меню
    const authContainer = $('authButtons');
    if (authContainer) {
        if (user) {
            // ЗМІНЕНО: Нікнейм тепер посилання на profile.html
            authContainer.innerHTML = `
                <a href="profile.html" class="user-badge" style="color: #fff; margin-right: 15px; text-decoration: none; cursor: pointer; transition: 0.3s;" onmouseover="this.style.color='var(--accent-yellow)'" onmouseout="this.style.color='#fff'">
                    👤 ${user.username}
                </a>
                <a href="#" onclick="handleLogout(event)" class="nav-gradient-link">Вийти</a>
            `;
        } else {
            authContainer.innerHTML = `
                <a href="#" onclick="openAuthModal(event)" class="nav-gradient-link">Увійти</a>
            `;
        }
    }
}

// Обробка реєстрації
async function handleRegister(e) {
    e.preventDefault();
    const username = $('regName')?.value;
    const email = $('regEmail')?.value;
    const password = $('regPass')?.value;
    const role = $('regRole')?.value || 'user';

    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role })
        });
        const data = await res.json();

        if (res.ok) {
            alert("Реєстрація успішна! Тепер увійдіть у свій акаунт.");
            e.target.reset();
            switchAuthMode('login'); // Перемикаємо на форму входу
        } else {
            alert(data.error || "Помилка реєстрації");
        }
    } catch (err) {
        console.error("Помилка запиту реєстрації:", err);
    }
}

// Обробка входу
async function handleLogin(e) {
    e.preventDefault();
    const email = $('loginEmail')?.value;
    const password = $('loginPass')?.value;

    try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert(`Вітаємо, ${data.user.username}!`);
            window.location.reload(); // Перезавантажуємо сторінку для оновлення інтерфейсу
        } else {
            alert(data.error || "Помилка входу");
        }
    } catch (err) {
        console.error("Помилка запиту входу:", err);
    }
}

// Обробка виходу
function handleLogout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}
window.handleLogout = handleLogout; // Робимо глобальною для HTML атрибутів onclick

// --- ОСНОВНИЙ ФУНКЦІОНАЛ ---

async function initAppData() {
    checkPermissions(); // Перевіряємо ролі відразу при запуску

    try {
        const [locRes, evRes] = await Promise.all([
            fetch('http://localhost:5000/api/locations'),
            fetch('http://localhost:5000/api/events')
        ]);
        window.locations = await locRes.json();
        window.events = await evRes.json();

        fillLocationSelects();
        applyFilters();
        loadTopEvents();
        updateEventCount();

        // ДОДАНО: Виклик функції для сторінки рейтингів
        loadTopRatedEvents();

    } catch (err) {
        console.error("Помилка завантаження даних з localhost:5000:", err);
    }
}

// Додавання нової події на сервер
async function handleAddEvent(e) {
    e.preventDefault();

    // 1. Отримуємо токен
    const token = localStorage.getItem('token');
    if (!token) {
        return alert("Тільки авторизовані організатори можуть додавати події. Будь ласка, увійдіть.");
    }

    const form = e.target;
    const formData = new FormData(form);

    // Додаємо координати вручну
    formData.set('lat', $('evLat')?.value || '');
    formData.set('lng', $('evLng')?.value || '');

    try {
        const response = await fetch('http://localhost:5000/api/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}` // 2. Відправляємо токен на бекенд
            },
            body: formData
        });

        if (response.ok) {
            alert("Подію та фото успішно додано! 📸🎉");
            form.reset();

            // Очищення допоміжних полів та скидання кастомного інпуту
            if ($('searchSuggestions')) $('searchSuggestions').innerHTML = '';
            if ($('evLat')) $('evLat').value = '';
            if ($('evLng')) $('evLng').value = '';

            // Скидання тексту в стилізованому блоці завантаження
            const labelText = $('file-name-text');
            if (labelText) labelText.textContent = "Натисніть, щоб обрати фото";
            document.querySelector('.file-upload-label')?.classList.remove('active');

            await initAppData();
        } else {
            const error = await response.json();
            alert("Помилка при збереженні: " + (error.message || "Невідома помилка"));
        }
    } catch (err) {
        console.error("Помилка відправки:", err);
        alert("Не вдалося зв'язатися із сервером localhost:5000.");
    }
}

// Логіка для блоку "Найближчі події"
async function loadTopEvents() {
    const container = $('topEventsContainer');
    if (!container) return;

    const topEvents = [...window.events]
        .filter(ev => new Date(ev.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

    container.innerHTML = '';

    if (topEvents.length === 0) {
        container.innerHTML = '<p class="empty-state">Найближчих подій поки немає</p>';
        return;
    }

    topEvents.forEach(ev => {
        const currentId = ev.id || ev.ID;
        const card = document.createElement('div');
        card.className = 'top-card';

        card.onclick = () => {
            sessionStorage.setItem('currentEventId', currentId);
            window.location.href = `./place.html?id=${currentId}`;
        };

        const imgSrc = ev.display_image || ev.image;

        card.innerHTML = `
            <img src="${getImgPath(imgSrc)}" alt="${ev.name}" onerror="this.src='images/placeholder.jpg'">
            <div class="top-card-overlay">
                <span class="top-card-type">${ev.type}</span>
                <h3>${ev.name}</h3>
                <div class="top-card-date">📅 ${new Date(ev.date).toLocaleDateString('uk-UA')}</div>
            </div>`;
        container.appendChild(card);
    });
}

// ДОДАНО: Завантаження Динамічного Рейтингу (для rating.html)
async function loadTopRatedEvents() {
    const container = $('topRatedContainer');
    if (!container) return; // Працює тільки на сторінці рейтингу

    try {
        const res = await fetch('http://localhost:5000/api/events/top');
        const topEvents = await res.json();

        container.innerHTML = '';

        if (topEvents.length === 0) {
            container.innerHTML = '<p class="empty-state">Поки немає жодної оціненої події в Сумах.</p>';
            return;
        }

        topEvents.forEach((ev, index) => {
            const card = document.createElement('a');
            const currentId = ev.id || ev.ID;
            card.href = `./place.html?id=${currentId}`;
            card.className = 'top-card';

            card.onclick = () => {
                sessionStorage.setItem('currentEventId', currentId);
            };

            const imgSrc = getImgPath(ev.display_image || ev.image);
            const rating = parseFloat(ev.avg_rating).toFixed(1);

            // Формуємо зірочки та підпис
            const ratingHtml = ev.review_count > 0
                ? `<span style="color: gold; font-size: 1.2rem;">★ ${rating}</span> <span style="font-size: 0.9rem; color: #ccc;">(${ev.review_count} відгуків)</span>`
                : `<span style="color: #888; font-size: 0.9rem;">Ще немає оцінок</span>`;

            card.innerHTML = `
                <span class="top-badge">${index + 1}</span>
                <img src="${imgSrc}" alt="${ev.name}" onerror="this.src='images/placeholder.jpg'">
                <span class="top-caption" style="display: flex; flex-direction: column; gap: 5px;">
                    <strong>${ev.name}</strong>
                    <div>${ratingHtml}</div>
                </span>
            `;

            container.appendChild(card);
        });
    } catch (err) {
        console.error("Помилка завантаження рейтингу:", err);
        container.innerHTML = '<p class="empty-state">Не вдалося завантажити рейтинг.</p>';
    }
}

function updateEventCount(count) {
    const badge = document.querySelector('.btn-count');
    if (badge) {
        badge.textContent = count !== undefined ? count : window.events.length;
    }
}

function fillLocationSelects() {
    const selects = document.querySelectorAll('#venue, #evVenue, #locCatalog');
    selects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = select.id === 'evVenue'
            ? '<option value="">– нове місце (з пошуку) –</option>'
            : '<option value="all">Усі локації</option>';

        window.locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.id;
            opt.textContent = loc.name;
            select.appendChild(opt);
        });
        select.value = currentVal;
    });
}

function applyFilters() {
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
    if (typeof renderMapMarkers === 'function') renderMapMarkers(filtered);

    updateEventCount(filtered.length);
}

function renderEventList(arr, containerId) {
    const container = $(containerId);
    if (!container) return;
    container.innerHTML = arr.length ? '' : '<p class="empty-state">Подій не знайдено 😕</p>';
    arr.forEach(ev => container.appendChild(createCard(ev, containerId === 'events-catalog')));
}

function createCard(ev, isCatalog = false) {
    const currentId = ev.id || ev.ID;
    const el = document.createElement('div');
    el.className = isCatalog ? 'catalog-card' : 'event-card';

    const detailsUrl = `./place.html?id=${currentId}`;
    const imgSrc = ev.display_image || ev.image;

    el.innerHTML = `
        <img src="${getImgPath(imgSrc)}" alt="${ev.name}" onerror="this.src='images/placeholder.jpg'">
        <div class="event-details">
            <span class="badge">${ev.type}</span>
            <h3>${ev.name}</h3>
            <p>📅 ${new Date(ev.date).toLocaleDateString('uk-UA')}</p>
            <a class="submit-btn detail-button" href="${detailsUrl}">Детальніше</a>
        </div>`;

    const btn = el.querySelector('.detail-button');
    if (btn) {
        btn.onclick = (e) => {
            sessionStorage.setItem('currentEventId', currentId);
        };
    }
    return el;
}

// Карта та Маркери
let map = null, cGrp = null;
if ($('map') && window.L) {
    map = L.map('map').setView([50.907, 34.798], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    cGrp = L.markerClusterGroup().addTo(map);
}

function renderMapMarkers(arr) {
    if (!cGrp) return;
    cGrp.clearLayers();
    arr.forEach(ev => {
        if (!ev.lat || !ev.lng) return;
        const m = L.marker([ev.lat, ev.lng], { icon: markerIcon(ev.type) });

        const popupContent = document.createElement('div');
        popupContent.innerHTML = `<b>${ev.name}</b><br><a href="./place.html?id=${ev.id}" class="popup-link">Деталі</a>`;
        popupContent.querySelector('.popup-link').onclick = (e) => {
            e.preventDefault();
            sessionStorage.setItem('currentEventId', ev.id);
            window.location.href = `./place.html?id=${ev.id}`;
        };

        m.bindPopup(popupContent);
        cGrp.addLayer(m);
    });
}

const markerIcon = t => {
    const icons = {
        'Музика': 'fa-music',
        'Кіно': 'fa-film',
        'Виставка': 'fa-paintbrush',
        'Спорт': 'fa-person-running',
        'Навчання': 'fa-book-open'
    };
    return L.divIcon({
        className: 'marker-custom',
        html: `<i class="fa-solid ${icons[t] || 'fa-map-pin'}"></i>`,
        iconSize: [30, 30]
    });
};

/* =========================================================
   4. Бургер та Слухачі
   ======================================================= */
document.addEventListener('DOMContentLoaded', () => {
    initAppData();

    // Слухачі для форм реєстрації/входу
    $('registerForm')?.addEventListener('submit', handleRegister);
    $('loginForm')?.addEventListener('submit', handleLogin);

    // Слухач для додавання події
    $('addEventForm')?.addEventListener('submit', handleAddEvent);

    // Логіка для кастомного інпуту файлів
    $('evImg')?.addEventListener('change', function () {
        const fileName = this.files[0]?.name;
        const label = document.querySelector('.file-upload-label');
        const labelText = $('file-name-text');

        if (fileName) {
            labelText.textContent = "Обрано: " + fileName;
            label.classList.add('active');
        } else {
            labelText.textContent = "Натисніть, щоб обрати фото";
            label.classList.remove('active');
        }
    });

    $('searchInput')?.addEventListener('input', applyFilters);
    ['category', 'catCatalog', 'venue', 'locCatalog', 'fromCat', 'toCat'].forEach(id => {
        $(id)?.addEventListener('change', applyFilters);
    });

    const burger = $('burger');
    const menu = $('navMenu');
    if (burger && menu) {
        burger.onclick = (e) => {
            e.preventDefault();
            menu.classList.toggle('show');
        };
    }

    const toggleBtn = $('toggle-event-list');
    const listCollapse = $('event-list-container');

    if (toggleBtn && listCollapse) {
        toggleBtn.onclick = function () {
            const btnText = this.querySelector('.btn-text');
            const isActive = listCollapse.classList.toggle('active');
            btnText.textContent = isActive ? 'Приховати список' : 'Показати список подій';
            if (isActive) {
                setTimeout(() => {
                    listCollapse.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 300);
            }
        };
    }

    $('addressSearch')?.addEventListener('input', (e) => {
        clearTimeout(window.st);
        window.st = setTimeout(async () => {
            const q = e.target.value;
            if (q.length < 3) return;
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
            const data = await res.json();
            const sugg = $('searchSuggestions');
            if (sugg) {
                sugg.innerHTML = '';
                data.forEach(item => {
                    const li = document.createElement('li');
                    li.textContent = item.display_name;
                    li.onclick = () => {
                        $('evLat').value = item.lat;
                        $('evLng').value = item.lon;
                        $('addressSearch').value = item.display_name;
                        sugg.innerHTML = '';
                    };
                    sugg.appendChild(li);
                });
            }
        }, 500);
    });
});