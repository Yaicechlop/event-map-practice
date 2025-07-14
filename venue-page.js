/* =========================================================
   venue-page.js
   ---------------------------------------------------------
   •  venues.html         → каталог-акордеон (тільки заголовки,
                            події підвантажуються по кліку)
   •  venues.html?id=3    → один конкретний заклад + події
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  if (!window.locations || !window.events) return;

  const wrap   = document.getElementById('venuesWrap');
  const hTitle = document.getElementById('heroTitle');
  const hSub   = document.getElementById('heroSub');
  if (!wrap) return;

  const params   = new URLSearchParams(location.search);
  const hasID    = params.has('id');
  const venueID  = hasID ? Number(params.get('id')) : null;

  /* -------------------------------------------------- *
   * 1. ОДИН КОНКРЕТНИЙ ЗАКЛАД  (venues.html?id=…)      *
   * -------------------------------------------------- */
  if (hasID) {
    const loc = locations.find(l => l.id === venueID);
    if (!loc) { wrap.innerHTML = '<p class="empty-state">Заклад не знайдено 😕</p>'; return; }

    /* змінюємо hero */
    hTitle.textContent = loc.name;
    hSub.textContent   = loc.address;

    /* події цього закладу */
    const evList = events.filter(ev => ev.venueId === venueID);

    const block = document.createElement('div');
    block.className = 'venue-block';
    block.innerHTML = `
      <div class="venue-card">
        <img src="images/${loc.image}" alt="${loc.name}">
        <h2>${loc.name}</h2>
        <p class="meta">📍 ${loc.address}</p>
        <p>${loc.description}</p>
      </div>

      <h3 class="center-text" style="margin-top:12px">Події у цьому закладі</h3>
      <div class="venue-events">
        ${evList.length
            ? evList.map(ev => createCard(ev,true).outerHTML).join('')
            : '<p class="empty-state">Поки що подій немає 🙌</p>'}
      </div>`;
    wrap.appendChild(block);

    /* перетворюємо рядки на createCard() */
    if (evList.length) {
      const grid = block.querySelector('.venue-events');
      evList.forEach((ev,i)=> grid.children[i].replaceWith(createCard(ev,true)));
    }

    /* кнопка «назад» */
    const back = document.createElement('p');
    back.innerHTML = '<a class="back-button" href="venues.html">← До всіх закладів</a>';
    wrap.appendChild(back);

    return;                 /* ← завершили режим одного закладу */
  }

  /* -------------------------------------------------- *
   * 2. КАТАЛОГ-АКОРДЕОН (venues.html)                  *
   * -------------------------------------------------- */
  locations.forEach((loc) => {
    /* головна картка-заголовок */
    const head = document.createElement('div');
    head.className = 'venue-card accordion-head';
    head.innerHTML = `
      <img src="images/${loc.image}" alt="${loc.name}">
      <h2>${loc.name}</h2>
      <p class="meta">📍 ${loc.address}</p>
      <p>${loc.description}</p>`;

    /* приховане тіло з подіями */
    const body = document.createElement('div');
    body.className = 'venue-body';
    body.hidden = true;                /* простий toggle */

    const container = document.createElement('div');
    container.className = 'venue-block';
    container.append(head, body);
    wrap.appendChild(container);

    /* клік: розгортання / згортання */
    head.addEventListener('click', () => {
      if (!body.dataset.loaded) {      /* рендеримо події одноразово */
        const evList = events.filter(ev => ev.venueId === loc.id);
        body.innerHTML = evList.length
          ? `<div class="venue-events">
               ${evList.map(ev => createCard(ev,true).outerHTML).join('')}
             </div>`
          : '<p class="empty-state">Поки що подій немає 🙌</p>';
        if (evList.length) {
          const grid = body.querySelector('.venue-events');
          evList.forEach((ev,i)=>
            grid.children[i].replaceWith(createCard(ev,true)));
        }
        body.dataset.loaded = '1';
      }
      body.hidden = !body.hidden;      /* toggle */
      head.classList.toggle('open');
    });
  });
});
