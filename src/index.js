const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
res.status(200).json({ ok: true, service: 'exchange-api' });
});

// Root
app.get('/', (req, res) => {
res.json({ message: 'Exchange API is running' });
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
console.log(`API started on port ${port}`);
});
