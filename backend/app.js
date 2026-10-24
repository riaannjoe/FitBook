require('dotenv').config();
require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json());

app.use('/api/v1/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts, try again later' } }
}));
app.get('/api/v1/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);
module.exports = app;
