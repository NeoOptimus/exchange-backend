const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { Pool } = require('pg');
const Redis = require('ioredis');

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
const redis = new Redis(process.env.REDIS_URL || '', {
lazyConnect: true,
maxRetriesPerRequest: 1,
});

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
if (redis.status !== 'ready') {
await redis.connect();
}
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
