// ============================================================
// server.js - CampusBite Node.js & Express Server
// ============================================================
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = require('./db');
const topsis = require('./topsis');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'canteen_secret_sem4',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 60 * 1000, // 30 minutes
        httpOnly: true,
    }
}));

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Auth Guard Middleware
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Please log in first.' });
    }
    next();
}

// ------------------------------------------------------------
// Auth API
// ------------------------------------------------------------
app.get('/api/me', (req, res) => {
    res.json({ user: req.session.user || null });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Please enter email and password.' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Incorrect email or password.' });
        }

        req.session.user = {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
        };

        res.json({ message: 'Login successful', user: req.session.user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

app.post('/api/register', async (req, res) => {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (!['student', 'faculty'].includes(role)) {
        return res.status(400).json({ error: 'Only students and faculty can register.' });
    }

    try {
        const check = await db.query('SELECT 1 FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'An account with that email already exists.' });
        }

        const hash = await bcrypt.hash(password, 10);
        const insert = await db.query(
            'INSERT INTO users (name, email, password_hash, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, name, email, role',
            [name.trim(), email.toLowerCase().trim(), hash, role, department || null]
        );

        res.json({ message: 'Account created!', user: insert.rows[0] });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Failed to create account.' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logged out successfully.' });
    });
});

// ------------------------------------------------------------
// Dashboard Stats API
// ------------------------------------------------------------
app.get('/api/stats', async (req, res) => {
    try {
        const c = await db.query('SELECT COUNT(*) FROM canteens');
        const m = await db.query('SELECT COUNT(*) FROM menu_items WHERE is_available = TRUE');
        const r = await db.query('SELECT COUNT(*) FROM criteria_ratings');
        const f = await db.query('SELECT COUNT(*) FROM feedback');

        res.json({
            canteens: parseInt(c.rows[0].count, 10),
            menu_items: parseInt(m.rows[0].count, 10),
            ratings: parseInt(r.rows[0].count, 10),
            reviews: parseInt(f.rows[0].count, 10),
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// ------------------------------------------------------------
// Canteens & Menus API
// ------------------------------------------------------------
app.get('/api/canteens', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.cid, c.cname, c.location,
                   ca.avg_price_rating, ca.avg_quality_rating, ca.avg_cleanliness_rating,
                   ca.avg_speed_rating, ca.avg_hygiene_rating, ca.total_ratings
            FROM canteens c
            LEFT JOIN canteen_criteria_avg ca ON ca.cid = c.cid
            ORDER BY c.cname
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch canteens.' });
    }
});

app.get('/api/canteens/:id/menu', async (req, res) => {
    const cid = parseInt(req.params.id, 10);
    try {
        const canteen = await db.query('SELECT cid, cname, location FROM canteens WHERE cid = $1', [cid]);
        if (canteen.rows.length === 0) return res.status(404).json({ error: 'Canteen not found' });

        const items = await db.query(`
            SELECT m.itemid, m.item_name, m.price,
                   ROUND(AVG(dr.rating)::numeric, 1) AS avg_rating,
                   COUNT(dr.dish_rating_id) AS total_ratings
            FROM menu_items m
            LEFT JOIN dish_ratings dr ON dr.itemid = m.itemid
            WHERE m.cid = $1 AND m.is_available = TRUE
            GROUP BY m.itemid, m.item_name, m.price
            ORDER BY m.item_name
        `, [cid]);

        res.json({ canteen: canteen.rows[0], items: items.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch menu.' });
    }
});

app.post('/api/canteens/:id/checkin', requireLogin, async (req, res) => {
    const cid = parseInt(req.params.id, 10);
    const uid = req.session.user.id;

    try {
        await db.query('INSERT INTO checkins (user_id, cid) VALUES ($1, $2)', [uid, cid]);
        res.json({ message: 'Checked in successfully!' });
    } catch (err) {
        res.status(429).json({ error: 'You already checked in recently. Cooldown is 15 minutes.' });
    }
});

app.post('/api/canteens/:id/rate', requireLogin, async (req, res) => {
    const cid = parseInt(req.params.id, 10);
    const uid = req.session.user.id;
    const { price, quality, cleanliness, speed, hygiene } = req.body;

    const values = [price, quality, cleanliness, speed, hygiene].map(v => parseInt(v, 10));
    if (values.some(v => isNaN(v) || v < 1 || v > 5)) {
        return res.status(400).json({ error: 'All 5 ratings must be between 1 and 5.' });
    }

    try {
        await db.query(`
            INSERT INTO criteria_ratings (user_id, cid, price_rating, quality_rating, cleanliness_rating, speed_rating, hygiene_rating)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [uid, cid, ...values]);
        res.json({ message: 'Rating submitted successfully!' });
    } catch (err) {
        res.status(400).json({ error: 'Failed to submit rating.' });
    }
});

app.get('/api/canteens/:id/feedback', async (req, res) => {
    const cid = parseInt(req.params.id, 10);
    try {
        const feedback = await db.query(`
            SELECT feedback_id, user_name, user_role, comment_text, created_at, likes, dislikes
            FROM feedback_with_votes
            WHERE cid = $1
            ORDER BY (likes - dislikes) DESC, created_at DESC
        `, [cid]);
        res.json(feedback.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load feedback.' });
    }
});

app.post('/api/canteens/:id/feedback', requireLogin, async (req, res) => {
    const cid = parseInt(req.params.id, 10);
    const uid = req.session.user.id;
    const comment = (req.body.comment_text || '').trim();

    if (!comment) return res.status(400).json({ error: 'Review text cannot be empty.' });

    try {
        await db.query('INSERT INTO feedback (user_id, cid, comment_text) VALUES ($1, $2, $3)', [uid, cid, comment]);
        res.json({ message: 'Review published!' });
    } catch (err) {
        res.status(500).json({ error: 'Could not post review.' });
    }
});

app.post('/api/feedback/:id/vote', requireLogin, async (req, res) => {
    const feedbackId = parseInt(req.params.id, 10);
    const voteType = parseInt(req.body.vote_type, 10);
    const uid = req.session.user.id;

    if (![1, -1].includes(voteType)) return res.status(400).json({ error: 'Invalid vote.' });

    try {
        await db.query(`
            INSERT INTO votes (feedback_id, user_id, vote_type)
            VALUES ($1, $2, $3)
            ON CONFLICT (feedback_id, user_id)
            DO UPDATE SET vote_type = EXCLUDED.vote_type, created_at = NOW()
        `, [feedbackId, uid, voteType]);
        res.json({ message: 'Vote recorded!' });
    } catch (err) {
        res.status(500).json({ error: 'Could not save vote.' });
    }
});

// ------------------------------------------------------------
// TOPSIS Ranking API
// ------------------------------------------------------------
app.get('/api/compare', async (req, res) => {
    const profile = req.query.profile || 'overall';
    let weights;

    if (profile === 'custom') {
        weights = topsis.normalizeCustomWeights(req.query);
    } else {
        weights = topsis.WEIGHT_PROFILES[profile] || topsis.WEIGHT_PROFILES.overall;
    }

    try {
        const ranking = await topsis.getTopsisRanking(weights, 5);
        const rawRes = await db.query('SELECT cid, cname, avg_price_rating, avg_quality_rating, avg_cleanliness_rating, avg_speed_rating, avg_hygiene_rating, avg_dish_rating, total_ratings FROM canteen_criteria_avg');
        const bayesRes = await db.query('SELECT cid, cname, bayes_price, bayes_quality, bayes_cleanliness, bayes_speed, bayes_hygiene, bayes_dish_rating, total_ratings FROM canteen_criteria_bayesian(5)');

        res.json({
            profile,
            weights,
            ranking,
            rawAverages: rawRes.rows,
            bayesAverages: bayesRes.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to calculate TOPSIS.' });
    }
});

// ------------------------------------------------------------
// Dish Compare API
// ------------------------------------------------------------
app.get('/api/dishes', async (req, res) => {
    try {
        const result = await db.query('SELECT DISTINCT item_name FROM menu_items ORDER BY item_name');
        res.json(result.rows.map(r => r.item_name));
    } catch (err) {
        res.status(500).json({ error: 'Failed to load dishes.' });
    }
});

app.get('/api/dishes/compare', async (req, res) => {
    const item = req.query.item || '';
    const sortBy = req.query.sort === 'value' ? 'value_score' : 'avg_rating';
    if (!item) return res.json([]);

    try {
        const result = await db.query(`
            SELECT cname, price, avg_rating, total_ratings, value_score
            FROM dish_ratings_by_canteen
            WHERE item_name = $1
            ORDER BY ${sortBy} DESC NULLS LAST
        `, [item]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to compare dish.' });
    }
});

app.post('/api/dishes/:id/rate', requireLogin, async (req, res) => {
    const itemid = parseInt(req.params.id, 10);
    const rating = parseInt(req.body.rating, 10);
    const uid = req.session.user.id;

    if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be 1 to 5.' });
    }

    try {
        await db.query('INSERT INTO dish_ratings (user_id, itemid, rating) VALUES ($1, $2, $3)', [uid, itemid, rating]);
        res.json({ message: 'Dish rating submitted!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to rate dish.' });
    }
});

// ------------------------------------------------------------
// Analytics API
// ------------------------------------------------------------
app.get('/api/analytics', async (req, res) => {
    try {
        const crowds = await db.query('SELECT cid, cname, hour_of_day, checkin_count FROM canteen_crowd_by_hour WHERE hour_of_day IS NOT NULL ORDER BY hour_of_day');
        const criteria = await db.query('SELECT cid, cname, avg_price_rating, avg_quality_rating, avg_cleanliness_rating, avg_speed_rating, avg_hygiene_rating, total_ratings FROM canteen_criteria_avg');
        const prices = await db.query('SELECT cid, cname, avg_item_price, total_items FROM canteen_avg_menu_price ORDER BY cname');

        res.json({
            crowds: crowds.rows,
            criteria: criteria.rows,
            prices: prices.rows,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load analytics.' });
    }
});

// Start Server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 CampusBite running at http://127.0.0.1:${PORT}`);
});