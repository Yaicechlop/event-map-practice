document.addEventListener('DOMContentLoaded', () => {
  if(!window.events || !window.locations){ alert('Нема даних'); return; }

  const id = Number(new URLSearchParams(location.search).get('id'));
  const ev = events.find(e => e._id === id);
  if(!ev){ document.body.innerHTML='<p class="empty-state">Подію не знайдено 😕</p>'; return; }

  const venue = locations.find(l => l.id === ev.venueId) || {};

  /* заповнюємо текст */
  evTitle.textContent = ev.name;
  evImg.src = `images/${ev.image}`; evImg.alt = ev.name;
  evDate.textContent = ev.date;
  evType.textContent = ev.type;
  evDesc.textContent = ev.description;
  locName.textContent = venue.name || '—';
  locContacts.textContent = venue.contact || '—';

  /* карта */
  const lat = venue.lat ?? ev.lat, lng = venue.lng ?? ev.lng;
  const map = L.map('mapSingle').setView([lat,lng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
              { attribution:'© OpenStreetMap' }).addTo(map);
  L.marker([lat,lng], { icon: markerIcon(ev.type) })
    .addTo(map).bindPopup(`<b>${ev.name}</b><br>${venue.name||''}`).openPopup();
});
