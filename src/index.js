
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

// --- DB (Postgres / Neon) ---
const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false } // для managed Postgres обычно ок
});

// --- Redis (Upstash) ---
const Redis = require('ioredis');

let redis = null;
if (process.env.REDIS_URL) {
redis = new Redis(process.env.REDIS_URL, {
maxRetriesPerRequest: 1,
enableReadyCheck: true,
lazyConnect: false,
tls: {}, // для rediss://
});

redis.on('error', (err) => {
console.error('Redis error:', err.message);
});
}

// root
app.get('/', (req, res) => {
res.json({ message: 'Exchange API is running' });
});

// health
app.get('/health', async (req, res) => {
const result = {
ok: true,
service: 'exchange-api',
api: 'ok',
db: 'unknown',
redis: 'unknown',
timestamp: new Date().toISOString(),
};

// DB check
try {
await pool.query('select 1');
result.db = 'ok';
} catch (e) {
result.db = 'fail';
result.ok = false;
result.db_error = e.message;
}

// Redis check
try {
if (!redis) throw new Error('REDIS_URL is missing');
const pong = await redis.ping();
result.redis = pong === 'PONG' ? 'ok' : 'fail';
if (result.redis !== 'ok') result.ok = false;
} catch (e) {
result.redis = 'fail';
result.ok = false;
result.redis_error = e.message;
}

return res.status(result.ok ? 200 : 503).json(result);
});

app.listen(port, '0.0.0.0', () => {
console.log(`API started on port ${port}`);
});

app.post('/auth/register', async (req, res) => {
try {
const { email, phone, password } = req.body || {};

if (!email || !phone || !password) {
return res.status(400).json({
error: 'email, phone, password are required'
});
}

if (String(password).length < 8) {
return res.status(400).json({
error: 'password must be at least 8 chars'
});
}

const passwordHash = await bcrypt.hash(password, 10);

const q = `
INSERT INTO users (email, phone, password_hash)
VALUES ($1, $2, $3)
RETURNING id, email, phone, email_verified, phone_verified, status, created_at
`;
const values = [String(email).toLowerCase().trim(), String(phone).trim(), passwordHash];
const { rows } = await pool.query(q, values);

return res.status(201).json({
user: rows[0],
email_verification_required: true,
phone_verification_required: true
});
} catch (e) {
// duplicate email/phone
if (e.code === '23505') {
return res.status(409).json({ error: 'email or phone already exists' });
}
console.error('register error:', e);
return res.status(500).json({ error: 'internal_error' });
}
});
