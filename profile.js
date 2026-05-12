'use strict';

const getEl = (id) => document.getElementById(id);

// Допоміжна функція для шляху до картинки
const getImgPath = (imgName) => {
    if (!imgName || imgName === 'placeholder.jpg') return 'images/placeholder.jpg';
    if (imgName.startsWith('http') || imgName.startsWith('data:')) return imgName;
    return `http://localhost:5000/images/${imgName}`;
};

// --- ПЕРЕВІРКА АВТОРИЗАЦІЇ ТА ЗАВАНТАЖЕННЯ ДАНИХ ---
document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userStr || !token) {
        alert("Будь ласка, увійдіть у систему, щоб переглянути особистий кабінет.");
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userStr);
    getEl('profileName').textContent = user.username;
    getEl('profileEmail').textContent = "Ваш кабінет активний";
    getEl('profileRole').textContent = user.role === 'organizer' ? 'Організатор' : 'Глядач';

    const tabs = getEl('organizerTabs');
    if (tabs && (user.role === 'organizer' || user.role === 'admin')) {
        tabs.style.display = 'flex';
    }

    loadFavorites(token);
});

function handleLogout(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}
window.handleLogout = handleLogout;

// --- ЗАВАНТАЖЕННЯ ВИБРАНИХ ПОДІЙ З БЕКЕНДУ ---
async function loadFavorites(token) {
    const grid = getEl('favoritesGrid');

    try {
        const res = await fetch('http://localhost:5000/api/favorites', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Помилка завантаження вибраного");

        const events = await res.json();

        if (events.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 24px; border: 1px dashed rgba(255,255,255,0.1);">
                    <i class="fa-solid fa-heart-crack" style="font-size: 40px; color: rgba(255,255,255,0.2); margin-bottom: 15px;"></i>
                    <h3 style="font-size: 20px; margin-bottom: 10px;">Тут поки порожньо</h3>
                    <p style="color: var(--text-dim); margin-bottom: 20px;">Ви ще не додали жодної події до вибраного.</p>
                    <a href="events.html" class="submit-btn" style="display: inline-flex; width: auto; text-decoration: none;">Перейти до каталогу</a>
                </div>
            `;
            return;
        }

        let html = '';
        events.forEach(ev => {
            const dateObj = new Date(ev.date);
            const dateStr = dateObj.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
            const imgSrc = getImgPath(ev.display_image || ev.image);

            html += `
                <div class="event-card" style="position: relative; display: flex; flex-direction: column;">
                    <div class="badge">${ev.type}</div>
                    
                    <button onclick="removeFavorite(event, ${ev.id})" style="position: absolute; top: 10px; right: 10px; background: rgba(255, 77, 77, 0.15); border: 1px solid rgba(255, 77, 77, 0.3); color: #ff4d4d; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; z-index: 10; backdrop-filter: blur(5px); transition: 0.3s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='#ff4d4d'; this.style.color='#fff'" onmouseout="this.style.background='rgba(255, 77, 77, 0.15)'; this.style.color='#ff4d4d'">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                    
                    <img src="${imgSrc}" alt="${ev.name}" onerror="this.src='images/placeholder.jpg'" style="width: 100%; height: 220px; object-fit: cover;">
                    
                    <div class="event-details" style="flex-grow: 1; display: flex; flex-direction: column;">
                        <h3 style="margin-bottom: 10px;">${ev.name}</h3>
                        <p style="color: var(--text-dim); margin-bottom: 20px; font-size: 14px;"><i class="fa-regular fa-calendar" style="color: var(--accent-yellow);"></i> ${dateStr}</p>
                        
                        <a href="#" onclick="goToEvent(event, ${ev.id})" class="submit-btn" style="margin-top: auto; text-align: center; text-decoration: none; padding: 12px 0;">Детальніше</a>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color: #ff4d4d;">Помилка завантаження даних.</p>';
    }
}

window.goToEvent = function (e, id) {
    e.preventDefault();
    sessionStorage.setItem('currentEventId', id);
    window.location.href = `place.html?id=${id}`;
};

window.removeFavorite = async function (e, eventId) {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm("Дійсно видалити цю подію зі збережених?")) return;

    try {
        const res = await fetch('http://localhost:5000/api/favorites/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ event_id: eventId })
        });

        if (res.ok) loadFavorites(token);
    } catch (err) { console.error("Помилка видалення:", err); }
};

// ==========================================
// ЛОГІКА ДЛЯ ОРГАНІЗАТОРІВ (ДАШБОРД)
// ==========================================

window.switchTab = function (tab) {
    const token = localStorage.getItem('token');

    const tabFavs = getEl('tabFavs');
    const tabManage = getEl('tabManage');
    if (tabFavs) tabFavs.classList.toggle('active', tab === 'favs');
    if (tabManage) tabManage.classList.toggle('active', tab === 'manage');

    if (tab === 'favs') {
        getEl('sectionTitle').innerHTML = '<i class="fa-solid fa-heart" style="color: #e91e63;"></i> Моє вибране';
        loadFavorites(token);
    } else {
        getEl('sectionTitle').innerHTML = '<i class="fa-solid fa-chart-line" style="color: var(--accent-yellow);"></i> Дашборд організатора';
        loadOrganizerEvents(token);
    }
}

async function loadOrganizerEvents(token) {
    const grid = getEl('favoritesGrid');
    grid.innerHTML = '<p style="color: var(--text-dim);">Завантаження статистики...</p>';

    try {
        const res = await fetch('http://localhost:5000/api/organizer/events', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Помилка завантаження дашборду");
        const events = await res.json();

        if (events.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 24px; border: 1px dashed rgba(255,255,255,0.1);">
                    <i class="fa-solid fa-calendar-plus" style="font-size: 40px; color: rgba(255,255,255,0.2); margin-bottom: 15px;"></i>
                    <h3 style="font-size: 20px; margin-bottom: 10px;">Ви ще не створили жодної події</h3>
                    <p style="color: var(--text-dim); margin-bottom: 20px;">Створюйте події, щоб відстежувати їхню статистику тут.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = events.map(ev => {
            const imgSrc = getImgPath(ev.image);
            return `
            <div class="event-card" style="display: flex; flex-direction: column;">
                <div class="badge" style="background: var(--primary)">${ev.type}</div>
                <img src="${imgSrc}" alt="${ev.name}" onerror="this.src='images/placeholder.jpg'" style="width: 100%; height: 220px; object-fit: cover;">
                <div class="event-details" style="flex-grow: 1; display: flex; flex-direction: column;">
                    <h3 style="margin-bottom: 10px;">${ev.name}</h3>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin: 10px 0 20px 0; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; font-size: 14px; border: 1px solid rgba(255,255,255,0.05);">
                        <span title="Рейтинг та відгуки" style="display: flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-star" style="color: gold; font-size: 16px;"></i> 
                            <strong style="color: #fff; font-size: 16px;">${parseFloat(ev.avg_rating).toFixed(1)}</strong> 
                            <span style="color: var(--text-dim); font-size: 12px;">(${ev.review_count})</span>
                        </span>
                        <span title="Скільки людей додали у вибране" style="display: flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-heart" style="color: #e91e63; font-size: 16px;"></i> 
                            <strong style="color: #fff; font-size: 16px;">${ev.fav_count}</strong>
                        </span>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: auto;">
                        <a href="#" onclick="goToEvent(event, ${ev.id})" class="submit-btn" style="flex: 1; text-align: center; text-decoration: none; padding: 12px 0;">Сторінка</a>
                        <button onclick="deleteEvent(${ev.id})" class="btn-outline" style="border-color: rgba(255, 77, 77, 0.3); color: #ff4d4d; width: 48px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; transition: 0.3s;" onmouseover="this.style.background='#ff4d4d'; this.style.color='#fff'; this.style.borderColor='#ff4d4d'" onmouseout="this.style.background='transparent'; this.style.color='#ff4d4d'; this.style.borderColor='rgba(255, 77, 77, 0.3)'" title="Видалити подію">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `}).join('');
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p style="color: #ff4d4d;">Не вдалося завантажити статистику.</p>';
    }
}

window.deleteEvent = async function (id) {
    if (!confirm("Ви впевнені, що хочете назавжди видалити цю подію та всі відгуки до неї?")) return;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`http://localhost:5000/api/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert("Подію успішно видалено.");
            switchTab('manage'); // Оновлюємо дашборд
        } else {
            const data = await res.json();
            alert(data.error || "Помилка видалення.");
        }
    } catch (err) {
        console.error(err);
        alert("Помилка зв'язку з сервером.");
    }
}