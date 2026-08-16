const express = require('express');
const pool = require('../db/pool');
const { queryActivePlayers } = require('../db/activePlayers');
const { SCORING, POSITION_CATEGORIES } = require('../scoring');

const router = express.Router();

router.get('/', async (req, res) => {
  const { position } = req.query;
  try {
    const players = await queryActivePlayers({ position });
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

router.get('/categories/:position', (req, res) => {
  const position = req.params.position.toUpperCase();
  const keys = POSITION_CATEGORIES[position];

  if (!keys) {
    return res.status(400).json({ error: `Unknown position: ${position}` });
  }

  const categories = keys.map((key) => ({ key, label: SCORING[key].label }));
  res.json({ position, categories });
});

function computeReliability(recentGames) {
  if (recentGames.length < 3) {
    return { score: 3, label: 'Limited data' };
  }

  const mean = recentGames.reduce((sum, v) => sum + v, 0) / recentGames.length;
  if (mean <= 0) {
    return { score: 3, label: 'Limited data' };
  }

  const variance =
    recentGames.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recentGames.length;
  const coefficientOfVariation = Math.sqrt(variance) / mean;

  if (coefficientOfVariation < 0.15) return { score: 5, label: 'Very consistent' };
  if (coefficientOfVariation < 0.3) return { score: 4, label: 'Consistent' };
  if (coefficientOfVariation < 0.45) return { score: 3, label: 'Average' };
  if (coefficientOfVariation < 0.65) return { score: 2, label: 'Volatile' };
  return { score: 1, label: 'Very volatile' };
}

router.post('/rank', async (req, res) => {
  const { position, priorities = {} } = req.body;
  const pos = (position || '').toUpperCase();
  const keys = POSITION_CATEGORIES[pos];

  if (!keys) {
    return res.status(400).json({ error: `Unknown position: ${pos}` });
  }

  try {
    const players = await queryActivePlayers({ position: pos });

    if (!players.length) {
      return res.json({ position: pos, ranked: [] });
    }

    const playerIds = players.map((p) => p.id);

    const statsResult = await pool.query(
      'SELECT * FROM player_projected_stats WHERE player_id = ANY($1::int[])',
      [playerIds]
    );
    const statsByPlayer = {};
    for (const row of statsResult.rows) {
      statsByPlayer[row.player_id] = statsByPlayer[row.player_id] || {};
      statsByPlayer[row.player_id][row.stat_key] = Number(row.stat_value);
    }

    const historyResult = await pool.query(
      `SELECT player_id, fantasy_points FROM player_stats_history
       WHERE player_id = ANY($1::int[])
       ORDER BY player_id, season DESC, week DESC`,
      [playerIds]
    );
    const historyByPlayer = {};
    for (const row of historyResult.rows) {
      historyByPlayer[row.player_id] = historyByPlayer[row.player_id] || [];
      if (historyByPlayer[row.player_id].length < 6) {
        historyByPlayer[row.player_id].push(Number(row.fantasy_points));
      }
    }

    const ranked = players
      .map((player) => {
        const stats = statsByPlayer[player.id] || {};
        let categoryScore = 0;
        const breakdown = [];

        for (const key of keys) {
          const value = stats[key] || 0;
          const config = SCORING[key];
          const weight = priorities[key] === true ? 1.5 : priorities[key] === false ? 0.5 : 1.0;
          const pointsContribution = value * config.pointsPerUnit * weight;
          categoryScore += pointsContribution;

          breakdown.push({
            key,
            label: config.label,
            statValue: Math.round(value * 100) / 100,
            weight,
            pointsContribution: Math.round(pointsContribution * 10) / 10,
          });
        }

        const finalScore = 0.3 * Number(player.projected_points) + 0.7 * categoryScore;
        const reliability = computeReliability(historyByPlayer[player.id] || []);

        return {
          ...player,
          category_score: Math.round(categoryScore * 10) / 10,
          final_score: Math.round(finalScore * 10) / 10,
          category_breakdown: breakdown,
          reliability: reliability.score,
          reliability_label: reliability.label,
        };
      })
      .sort((a, b) => b.final_score - a.final_score);

    res.json({ position: pos, ranked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to rank players' });
  }
});

module.exports = router;
