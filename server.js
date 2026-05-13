const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Беремо секрет з налаштувань Render, або використовуємо локальний
const JWT_SECRET = process.env.JWT_SECRET || 'tviy_sekretniy_kluch_123';

app.use(cors());
app.use(express.json());

// ==========================================
// НАЛАШТУВАННЯ ДЛЯ ХОСТИНГУ (RENDER)
// ==========================================
// Дозволяємо браузеру бачити файли в папці images
app.use('/images', express.static('images'));

// Кажемо серверу віддавати твої HTML, CSS та JS файли
app.use(express.static(__dirname));

// Якщо хтось заходить на головну сторінку сайту, відправляємо йому index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// НАЛАШТУВАННЯ ЗАВАНТАЖЕННЯ ФОТО
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ==========================================
// ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ (AIVEN MYSQL)
// ==========================================
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'podiy_sumy',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    // ВАЖЛИВО: Aiven вимагає SSL для підключення
    ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : undefined
});

db.connect(err => {
    if (err) return console.error('Помилка MySQL:', err.message);
    console.log('Успішно підключено до MySQL!');
});

// ==========================================
// MIDDLEWARE: Охоронець маршрутів
// ==========================================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Доступ заборонено. Токен відсутній. Увійдіть в систему." });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Недійсний або протермінований токен." });
        req.user = user;
        next();
    });
};

// ==========================================
// МАРШРУТИ АВТОРИЗАЦІЇ
// ==========================================
// Реєстрація користувача
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error("Помилка БД при пошуку:", err.message);
                return res.status(500).json({ error: "Помилка бази даних: " + err.message });
            }

            if (results.length > 0) return res.status(400).json({ error: "Цей email вже зайнятий" });

            const hashedPassword = await bcrypt.hash(password, 10);
            const sql = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";

            db.query(sql, [username, email, hashedPassword, role || 'user'], (err, result) => {
                if (err) {
                    console.error("Помилка БД при записі:", err.message);
                    return res.status(500).json({ error: "Помилка збереження: " + err.message });
                }
                res.json({ message: "Реєстрація успішна!", userId: result.insertId });
            });
        });
    } catch (e) {
        console.error("Критична помилка сервера:", e);
        res.status(500).json({ error: "Помилка на сервері" });
    }
});

// Вхід у систему
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(400).json({ error: "Користувача не знайдено" });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Невірний пароль" });

        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: "Вхід успішний!",
            token: token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    });
});

// ==========================================
// МАРШРУТИ РЕЙТИНГІВ ТА ВІДГУКІВ
// ==========================================
// Отримати всі відгуки для конкретної події
app.get('/api/reviews/:eventId', (req, res) => {
    const sql = `
        SELECT r.rating, r.comment, u.username 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.event_id = ? 
        ORDER BY r.id DESC
    `;
    db.query(sql, [req.params.eventId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Отримати ТОП подій за рейтингом
app.get('/api/events/top', (req, res) => {
    const sql = `
        SELECT e.*, 
               CASE WHEN e.link IS NOT NULL AND e.link != '' AND e.link != 'NULL' THEN e.link ELSE e.image END as display_image,
               COALESCE(AVG(r.rating), 0) as avg_rating,
               COUNT(r.id) as review_count
        FROM events e
        LEFT JOIN reviews r ON e.id = r.event_id
        GROUP BY e.id
        ORDER BY avg_rating DESC, review_count DESC
        LIMIT 10
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Додати відгук та оцінку
app.post('/api/reviews', authenticateToken, (req, res) => {
    const { event_id, rating, comment } = req.body;
    const user_id = req.user.id;

    db.query("SELECT * FROM reviews WHERE event_id = ? AND user_id = ?", [event_id, user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: "Ви вже залишили відгук на цю подію. Можна залишити лише один відгук." });

        const sql = "INSERT INTO reviews (event_id, user_id, rating, comment) VALUES (?, ?, ?, ?)";
        db.query(sql, [event_id, user_id, rating, comment], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Відгук успішно додано!" });
        });
    });
});

// ==========================================
// МАРШРУТИ ДЛЯ "ВИБРАНОГО" ТА ДАШБОРДУ ОРГАНІЗАТОРА
// ==========================================

// 1. Додати або видалити з вибраного (Toggle)
app.post('/api/favorites/toggle', authenticateToken, (req, res) => {
    const { event_id } = req.body;
    const user_id = req.user.id;

    db.query("SELECT * FROM favorites WHERE user_id = ? AND event_id = ?", [user_id, event_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            db.query("DELETE FROM favorites WHERE user_id = ? AND event_id = ?", [user_id, event_id], (err, deleteResult) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Видалено з вибраного", isFavorite: false });
            });
        } else {
            db.query("INSERT INTO favorites (user_id, event_id) VALUES (?, ?)", [user_id, event_id], (err, insertResult) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: "Додано у вибране", isFavorite: true });
            });
        }
    });
});

// 2. Отримати всі збережені події для Особистого кабінету
app.get('/api/favorites', authenticateToken, (req, res) => {
    const user_id = req.user.id;
    const sql = `
        SELECT e.*, 
        CASE WHEN e.link IS NOT NULL AND e.link != '' AND e.link != 'NULL' THEN e.link ELSE e.image END as display_image
        FROM events e
        JOIN favorites f ON e.id = f.event_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    `;

    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. Перевірити, чи лайкнув користувач конкретну подію
app.get('/api/favorites/check/:eventId', authenticateToken, (req, res) => {
    const event_id = req.params.eventId;
    const user_id = req.user.id;

    db.query("SELECT * FROM favorites WHERE user_id = ? AND event_id = ?", [user_id, event_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ isFavorite: results.length > 0 });
    });
});

// 4. Отримати події організатора зі статистикою (Дашборд) - З РОЗДІЛЕННЯМ ПРАВ
app.get('/api/organizer/events', authenticateToken, (req, res) => {
    if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Доступ заборонено." });
    }

    let sql = `
        SELECT e.*, 
               COALESCE(AVG(r.rating), 0) as avg_rating,
               COUNT(DISTINCT r.id) as review_count,
               COUNT(DISTINCT f.id) as fav_count
        FROM events e
        LEFT JOIN reviews r ON e.id = r.event_id
        LEFT JOIN favorites f ON e.id = f.event_id
    `;

    const queryParams = [];

    if (req.user.role === 'organizer') {
        sql += ` WHERE e.user_id = ?`;
        queryParams.push(req.user.id);
    }

    sql += ` GROUP BY e.id ORDER BY e.date DESC`;

    db.query(sql, queryParams, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 5. Видалення події організатором/адміном
app.delete('/api/events/:id', authenticateToken, (req, res) => {
    const sql = "DELETE FROM events WHERE id = ? AND (user_id = ? OR ? = 'admin')";

    db.query(sql, [req.params.id, req.user.id, req.user.role], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.affectedRows === 0) {
            return res.status(403).json({ error: "У вас немає прав для видалення цієї події." });
        }

        res.json({ message: "Подію успішно видалено" });
    });
});

// ==========================================
// МАРШРУТИ ПОДІЙ ТА ЛОКАЦІЙ
// ==========================================
// 1. Отримати всі події
app.get('/api/events', (req, res) => {
    const sql = `
        SELECT *, 
        CASE 
            WHEN link IS NOT NULL AND link != '' AND link != 'NULL' THEN link 
            ELSE image 
        END as display_image 
        FROM events ORDER BY date ASC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. Отримати всі локації
app.get('/api/locations', (req, res) => {
    db.query("SELECT * FROM locations ORDER BY name ASC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. Додати подію (З АВТОМАТИЧНИМ СТВОРЕННЯМ ЗАКЛАДУ ТА ПРИВ'ЯЗКОЮ АВТОРА)
app.post('/api/events', authenticateToken, upload.single('image'), (req, res) => {
    if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Доступ заборонено." });
    }

    const { name, type, date, description, lat, lng, location_contacts, address } = req.body;
    let { venueId } = req.body;
    const finalImageName = req.file ? req.file.filename : 'placeholder.jpg';
    const user_id = req.user.id;

    const saveEvent = (finalVenueId) => {
        const sql = `INSERT INTO events 
            (name, type, date, description, image, venueId, lat, lng, location_contacts, address, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(sql, [
            name, type, date, description, finalImageName,
            finalVenueId,
            (lat && lat !== '') ? lat : null,
            (lng && lng !== '') ? lng : null,
            location_contacts || '',
            address || '',
            user_id
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: result.insertId, imageName: finalImageName });
        });
    };

    if ((!venueId || venueId === 'null') && address) {
        const locationName = address.split(',')[0];

        const locSql = `INSERT INTO locations (name, address, lat, lng, contact, image) VALUES (?, ?, ?, ?, ?, ?)`;
        db.query(locSql, [
            locationName,
            address,
            lat || null,
            lng || null,
            location_contacts || '',
            finalImageName
        ], (err, locResult) => {
            if (err) {
                console.error("Помилка створення локації:", err);
                return saveEvent(null);
            }
            saveEvent(locResult.insertId);
        });
    } else {
        saveEvent((venueId && venueId !== 'null') ? venueId : null);
    }
});

// 4. Деталі події
app.get('/api/events/:id', (req, res) => {
    const sql = `
        SELECT e.*, 
               CASE 
                   WHEN e.link IS NOT NULL AND e.link != '' AND e.link != 'NULL' THEN e.link 
                   ELSE e.image 
               END as final_image,
               COALESCE(l.name, e.address, 'Суми') as location_name, 
               COALESCE(l.contact, e.location_contacts) as location_contacts
        FROM events e 
        LEFT JOIN locations l ON e.venueId = l.id 
        WHERE e.id = ?`;

    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.length === 0) return res.status(404).json({ error: "Подію не знайдено" });
        res.json(result[0]);
    });
});

// Використовуємо порт, який дасть хостинг, або 5000 для локальної розробки
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
});