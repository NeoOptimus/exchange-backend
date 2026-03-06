
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

function signAccessToken(user) {
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is missing');

return jwt.sign(
{
sub: user.id,
email: user.email,
phone: user.phone,
role: 'client'
},
secret,
{ expiresIn: '15m' }
);
}

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
return res.status(500).json({error: 'internal_error',detail: e.message,code: e.code || null});
}
});

app.post('/auth/login', async (req, res) => {
try {
const { email_or_phone, password } = req.body || {};

if (!email_or_phone || !password) {
return res.status(400).json({ error: 'email_or_phone and password are required' });
}

const q = `
SELECT id, email, phone, password_hash, status
FROM users
WHERE email = $1 OR phone = $1
LIMIT 1
`;
const { rows } = await pool.query(q, [String(email_or_phone).trim().toLowerCase()]);
const user = rows[0];

if (!user) {
await pool.query(
`INSERT INTO login_attempts (user_id, success, ip, user_agent) VALUES ($1, $2, $3, $4)`,
[null, false, req.ip, req.headers['user-agent'] || null]
);
return res.status(401).json({ error: 'invalid_credentials' });
}

const passOk = await bcrypt.compare(password, user.password_hash);
if (!passOk) {
await pool.query(
`INSERT INTO login_attempts (user_id, success, ip, user_agent) VALUES ($1, $2, $3, $4)`,
[user.id, false, req.ip, req.headers['user-agent'] || null]
);
return res.status(401).json({ error: 'invalid_credentials' });
}

if (user.status !== 'active') {
return res.status(403).json({ error: 'user_inactive' });
}

const accessToken = signAccessToken(user);

await pool.query(
`INSERT INTO login_attempts (user_id, success, ip, user_agent) VALUES ($1, $2, $3, $4)`,
[user.id, true, req.ip, req.headers['user-agent'] || null]
);

return res.status(200).json({
access_token: accessToken,
token_type: 'Bearer',
expires_in: 900
});
} catch (e) {
console.error('login error:', e);
return res.status(500).json({ error: 'internal_error', detail: e.message });
}
});