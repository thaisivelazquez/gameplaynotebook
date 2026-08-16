require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const pickRoutes = require('./routes/picks');
const playerRoutes = require('./routes/players');
const rulesRoutes = require('./routes/rules');
const rosterRoutes = require('./routes/roster');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/picks', pickRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/roster', rosterRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`NFL Pick'em API listening on port ${PORT}`);
});
