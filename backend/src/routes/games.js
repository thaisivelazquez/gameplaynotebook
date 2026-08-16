const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/games?season=2026&week=1
router.get('/', async (req, res) => {
  const { season, week } = req.query;
  const conditions = [];
  const values = [];

  if (season) {
    values.push(season);
    conditions.push(`season = $${values.length}`);
  }
  if (week) {
    values.push(week);
    conditions.push(`week = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT * FROM games ${where} ORDER BY week ASC, kickoff_time ASC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// POST /api/games  (create a matchup - any logged-in user can add for now)
router.post('/', requireAuth, async (req, res) => {
  const { season, week, home_team, away_team, kickoff_time } = req.body;

  if (!season || !week || !home_team || !away_team || !kickoff_time) {
    return res.status(400).json({
      error: 'season, week, home_team, away_team, and kickoff_time are required',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO games (season, week, home_team, away_team, kickoff_time)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [season, week, home_team, away_team, kickoff_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// PUT /api/games/:id/score  (record the final score and grade every pick)
router.put('/:id/score', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { home_score, away_score } = req.body;

  if (home_score === undefined || away_score === undefined) {
    return res.status(400).json({ error: 'home_score and away_score are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const gameResult = await client.query(
      `UPDATE games SET home_score = $1, away_score = $2, status = 'final'
       WHERE id = $3 RETURNING *`,
      [home_score, away_score, id]
    );

    const game = gameResult.rows[0];
    if (!game) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Game not found' });
    }

    const winner =
      home_score > away_score ? game.home_team : away_score > home_score ? game.away_team : 'TIE';

    // Grade every pick for this game:
    //   +1 point for picking the correct winner
    //   +2 bonus points for an exact final-score prediction
    const picksResult = await client.query('SELECT * FROM picks WHERE game_id = $1', [id]);

    for (const pick of picksResult.rows) {
      let points = 0;
      if (pick.picked_team === winner) points += 1;
      if (
        pick.predicted_home_score === home_score &&
        pick.predicted_away_score === away_score
      ) {
        points += 2;
      }

      await client.query('UPDATE picks SET points_earned = $1, updated_at = NOW() WHERE id = $2', [
        points,
        pick.id,
      ]);
    }

    await client.query('COMMIT');
    res.json({ game, winner, picks_graded: picksResult.rows.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update score' });
  } finally {
    client.release();
  }
});

module.exports = router;
