'use strict'; document.addEventListener('DOMContentLoaded', async () => {
    const wrap = document.getElementById('venuesWrap');
    const hTitle = document.getElementById('heroTitle');
    const hSub = document.getElementById('heroSub');
    if (!wrap) return;

    let locations = [];
    let events = [];

    try {
        wrap.innerHTML = '<p class="loading-text center-text">Завантаження списку локацій...</p>';

        // ВИПРАВЛЕНО: Видалено http://localhost:5000
        const [locRes, evRes] = await Promise.all([
            fetch('/api/locations'),
            fetch('/api/events')
        ]);

        if (!locRes.ok || !evRes.ok) throw new Error("Помилка запиту");

        locations = await locRes.json();
        events = await evRes.json();
        wrap.innerHTML = ''; // Очищуємо після завантаження
    } catch (err) {
        console.error("Помилка завантаження закладів:", err);
        wrap.innerHTML = '<p class="empty-state">Помилка підключення до бази даних 😕</p>';
        return;
    }

    const params = new URLSearchParams(location.search);
    const venueID = params.has('id') ? Number(params.get('id')) : null;

    /* -------------------------------------------------- *
     * 1. РЕЖИМ: ОДИН КОНКРЕТНИЙ ЗАКЛАД                  *
     * -------------------------------------------------- */
    if (venueID) {
        const loc = locations.find(l => Number(l.id) === venueID);
        if (!loc) {
            wrap.innerHTML = '<p class="empty-state">Заклад не знайдено 😕</p>';
            return;
        }

        if (hTitle) hTitle.textContent = loc.name;
        if (hSub) hSub.textContent = loc.address || "Адреса уточнюється";

        const evList = events.filter(ev => Number(ev.venueId) === venueID);

        const block = document.createElement('div');
        block.className = 'venue-single-view';
        block.innerHTML = `
            <div class="venue-card single">
                <img src="images/${loc.image}" alt="${loc.name}" onerror="this.src='images/placeholder.jpg'">
                <div class="event-details">
                    <h2 class="catalog-title" style="font-size: 28px; text-align: left; margin: 0 0 15px 0;">${loc.name}</h2>
                    <p class="meta">📍 ${loc.address || 'Сумська обл.'}</p>
                    <p style="margin-top: 15px; color: var(--text-dim);">${loc.description || 'Опис закладу незабаром з’явиться.'}</p>
                    ${loc.contact ? `<p style="margin-top: 10px; color: var(--accent-yellow);">📞 ${loc.contact}</p>` : ''}
                </div>
            </div>
            <h3 class="catalog-title" style="font-size: 24px; margin-top: 50px;">Події у цьому закладі</h3>
            <div class="venue-events event-grid"></div>`;

        wrap.appendChild(block);

        const grid = block.querySelector('.venue-events');
        if (evList.length) {
            evList.forEach(ev => {
                if (typeof createCard === 'function') {
                    grid.appendChild(createCard(ev, true));
                }
            });
        } else {
            grid.innerHTML = '<p class="empty-state">Поки що подій немає 🙌</p>';
        }
        return;
    }

    /* -------------------------------------------------- *
     * 2. РЕЖИМ: КАТАЛОГ-АКОРДЕОН (ВИПРАВЛЕНО)           *
     * -------------------------------------------------- */
    locations.forEach((loc) => {
        const container = document.createElement('div');
        container.className = 'venue-card'; // Використовуємо наш преміум клас
        container.style.cursor = 'pointer';
        container.style.marginBottom = '20px';

        container.innerHTML = `
            <div class="accordion-head" style="display: flex; align-items: center; padding: 20px; gap: 20px;">
                <img src="images/${loc.image}" alt="${loc.name}" 
                     style="width: 80px; height: 80px; border-radius: 12px; object-fit: cover;"
                     onerror="this.src='images/placeholder.jpg'">
                <div class="venue-summary" style="flex: 1;">
                    <h2 style="font-size: 20px; margin: 0;">${loc.name}</h2>
                    <p class="meta" style="margin: 5px 0 0 0; font-size: 14px;">📍 ${loc.address || 'Суми'}</p>
                </div>
                <span class="chevron" style="transition: 0.3s; color: var(--accent-yellow);">▼</span>
            </div>
            <div class="venue-body">
                <div class="venue-events event-grid" style="padding: 20px;"></div>
            </div>`;

        wrap.appendChild(container);

        const head = container.querySelector('.accordion-head');
        const body = container.querySelector('.venue-body');
        const grid = container.querySelector('.venue-events');

        head.addEventListener('click', () => {
            // Перевіряємо завантаження подій
            if (!body.dataset.loaded) {
                const evList = events.filter(ev => Number(ev.venueId) === Number(loc.id));

                if (evList.length) {
                    evList.forEach(ev => {
                        if (typeof createCard === 'function') {
                            grid.appendChild(createCard(ev, true));
                        }
                    });
                } else {
                    grid.innerHTML = '<p class="empty-state">На найближчий час подій немає 🙌</p>';
                }
                body.dataset.loaded = '1';
            }

            // ПЕРЕМИКАННЯ (Для CSS анімації)
            const isOpen = body.classList.contains('active');

            // Закриваємо інші (опціонально)
            document.querySelectorAll('.venue-body').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.accordion-head').forEach(h => h.classList.remove('open'));

            if (!isOpen) {
                body.classList.add('active');
                head.classList.add('open');
            }
        });
    });
});