// Ініціалізація карти
var map = L.map('map').setView([50.9077, 34.7981], 13);

// Додавання OSM шару
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
}).addTo(map);

// Мокові події
const events = [
    {
        name: "Концерт гурту XYZ",
        lat: 50.9110,
        lng: 34.8020,
        type: "Музика",
        date: "2025-07-10",
        description: "Концерт на площі Незалежності"
    },
    {
        name: "Кінопоказ просто неба",
        lat: 50.9050,
        lng: 34.7985,
        type: "Кіно",
        date: "2025-07-12",
        description: "Безкоштовний кінопоказ у міському парку"
    },
    {
        name: "Виставка художників",
        lat: 50.9095,
        lng: 34.7960,
        type: "Виставка",
        date: "2025-07-15",
        description: "Виставка у краєзнавчому музеї"
    },
    {
        name: "Відкрите тренування",
        lat: 50.9080,
        lng: 34.8030,
        type: "Спорт",
        date: "2025-07-13",
        description: "Відкрите тренування з йоги у парку"
    }
];

// Додавання маркерів на карту
events.forEach(event => {
    const marker = L.marker([event.lat, event.lng]).addTo(map);
    marker.bindPopup(`<b>${event.name}</b><br>${event.description}<br><i>${event.date} | ${event.type}</i>`);
});
