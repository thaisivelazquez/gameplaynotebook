const pool = require('./pool');
const { REAL_DATA_POSITIONS } = require('../scoring');

// The most recent season present in real stat history, or null if no real
// data has been imported yet (fresh install).
async function getLatestSeason() {
  const result = await pool.query('SELECT MAX(season) AS season FROM player_stats_history');
  return result.rows[0].season;
}

// Returns players, filtered so that anyone at a position we track real
// history for (QB/RB/WR/TE) only shows up if they actually appeared in the
// most recent season on record — this is what keeps retired players (e.g.
// someone who last played in 2022, pulled in by a historical import) out of
// the pool. Positions without real tracking yet (K, DEF) are always
// returned unfiltered, since there's no "last played" data to check them
// against. If position is omitted, returns everyone under this rule.
async function queryActivePlayers({ position } = {}) {
  const pos = position ? position.toUpperCase() : null;
  const latestSeason = await getLatestSeason();

  const filteredPositions = pos
    ? (REAL_DATA_POSITIONS.includes(pos) ? [pos] : [])
    : REAL_DATA_POSITIONS;

  const unfilteredPositions = pos
    ? (REAL_DATA_POSITIONS.includes(pos) ? [] : [pos])
    : ['K', 'DEF'];

  const rows = [];

  if (filteredPositions.length) {
    if (latestSeason === null) {
      // No history imported yet — show everyone rather than an empty pool.
      const result = await pool.query('SELECT * FROM players WHERE position = ANY($1::text[])', [
        filteredPositions,
      ]);
      rows.push(...result.rows);
    } else {
      const result = await pool.query(
        `SELECT DISTINCT p.*
         FROM players p
         JOIN player_stats_history h ON h.player_id = p.id AND h.season = $1
         WHERE p.position = ANY($2::text[])`,
        [latestSeason, filteredPositions]
      );
      rows.push(...result.rows);
    }
  }

  if (unfilteredPositions.length) {
    const result = await pool.query('SELECT * FROM players WHERE position = ANY($1::text[])', [
      unfilteredPositions,
    ]);
    rows.push(...result.rows);
  }

  rows.sort((a, b) => {
    if (a.position !== b.position) return a.position.localeCompare(b.position);
    return Number(b.projected_points) - Number(a.projected_points);
  });

  return rows;
}

module.exports = { getLatestSeason, queryActivePlayers };