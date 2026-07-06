require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const repoRoutes = require('./routes/repos');
const ruleRoutes = require('./routes/rules');
const eventRoutes = require('./routes/events');
const webhookRoutes = require('./routes/webhooks');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());

// IMPORTANT: the webhook route needs the raw request body (as a Buffer) to verify
// GitHub's HMAC signature, so it's mounted BEFORE express.json() with its own
// raw-body parser scoped to just that path. Every other route gets normal JSON parsing.
app.use('/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/events', eventRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
