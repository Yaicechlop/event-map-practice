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
    },
    {
        name: "Лекція з історії міста",
        lat: 50.9105,
        lng: 34.7950,
        type: "Навчання",
        date: "2025-07-14",
        description: "Відкрита лекція у бібліотеці"
    },
    {
        name: "Міський фестиваль музики",
        lat: 50.9120,
        lng: 34.8050,
        type: "Музика",
        date: "2025-07-18",
        description: "Фестиваль на стадіоні"
    },
    {
        name: "Вечір короткометражок",
        lat: 50.9065,
        lng: 34.7970,
        type: "Кіно",
        date: "2025-07-20",
        description: "Кінопоказ у молодіжному центрі"
    },
    {
        name: "Виставка фотографій",
        lat: 50.9088,
        lng: 34.7995,
        type: "Виставка",
        date: "2025-07-22",
        description: "Виставка у галереї"
    },
    {
        name: "Змагання з бігу",
        lat: 50.9030,
        lng: 34.8000,
        type: "Спорт",
        date: "2025-07-24",
        description: "Міські змагання з бігу у парку"
    },
    {
        name: "Майстер-клас з малювання",
        lat: 50.9090,
        lng: 34.8040,
        type: "Навчання",
        date: "2025-07-26",
        description: "Майстер-клас у художній школі"
    }
];


// Глобальний масив для збереження маркерів
let markers = [];

// Функція для відображення подій на карті
function displayEvents(filteredEvents) {
    // Видалення старих маркерів
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    filteredEvents.forEach(event => {
        const marker = L.marker([event.lat, event.lng]).addTo(map);
        marker.bindPopup(`<b>${event.name}</b><br>${event.description}<br><i>${event.date} | ${event.type}</i>`);
        markers.push(marker);
    });
}

// Відображаємо всі події при завантаженні
displayEvents(events);

// Фільтрація
document.getElementById('filterButton').addEventListener('click', () => {
    const selectedCategory = document.getElementById('category').value;
    const selectedDate = document.getElementById('date').value;

    const filtered = events.filter(event => {
        const matchCategory = selectedCategory === 'all' || event.type === selectedCategory;
        const matchDate = !selectedDate || event.date === selectedDate;
        return matchCategory && matchDate;
    });

    displayEvents(filtered);
});
