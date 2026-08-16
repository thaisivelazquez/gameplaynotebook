const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/picks/me  - the logged-in user's picks, joined with game info
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, g.season, g.week, g.home_team, g.away_team, g.kickoff_time,
              g.home_score, g.away_score, g.status
       FROM picks p
       JOIN games g ON g.id = p.game_id
       WHERE p.user_id = $1
       ORDER BY g.week ASC, g.kickoff_time ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch picks' });
  }
});

// POST /api/picks  - create or update a pick for a game (upsert)
router.post('/', requireAuth, async (req, res) => {
  const { game_id, picked_team, predicted_home_score, predicted_away_score } = req.body;

  if (!game_id || !picked_team) {
    return res.status(400).json({ error: 'game_id and picked_team are required' });
  }

  try {
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [game_id]);
    const game = gameResult.rows[0];
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (new Date(game.kickoff_time) <= new Date()) {
      return res.status(400).json({ error: 'Picks lock at kickoff for this game' });
    }

    const result = await pool.query(
      `INSERT INTO picks (user_id, game_id, picked_team, predicted_home_score, predicted_away_score)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, game_id)
       DO UPDATE SET picked_team = EXCLUDED.picked_team,
                     predicted_home_score = EXCLUDED.predicted_home_score,
                     predicted_away_score = EXCLUDED.predicted_away_score,
                     updated_at = NOW()
       RETURNING *`,
      [req.user.id, game_id, picked_team, predicted_home_score ?? null, predicted_away_score ?? null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save pick' });
  }
});

// GET /api/picks/leaderboard
router.get('/leaderboard', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leaderboard');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
