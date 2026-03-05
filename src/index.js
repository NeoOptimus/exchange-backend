
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
const bcrypt = require('bcryptjs');
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
