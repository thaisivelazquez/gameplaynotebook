// League scoring settings, transcribed from the uploaded Yahoo "Scoring & Settings"
// page (League of Extraordinary Drunx, ID# 348101): 25 yds/pt passing, 4pt passing
// TD, full-PPR receptions, 10 yds/pt rushing & receiving, etc. Edit these values if
// your league's settings differ.

const SCORING = {
  pass_yards: { label: 'Passing Yards', pointsPerUnit: 1 / 25 },
  pass_td: { label: 'Passing Touchdowns', pointsPerUnit: 4 },
  interceptions: { label: 'Interceptions Thrown', pointsPerUnit: -1 },
  rush_yards: { label: 'Rushing Yards', pointsPerUnit: 1 / 10 },
  rush_td: { label: 'Rushing Touchdowns', pointsPerUnit: 6 },
  receptions: { label: 'Receptions', pointsPerUnit: 1 }, // full PPR per league settings
  rec_yards: { label: 'Receiving Yards', pointsPerUnit: 1 / 10 },
  rec_td: { label: 'Receiving Touchdowns', pointsPerUnit: 6 },
  fumbles_lost: { label: 'Fumbles Lost', pointsPerUnit: -2 },
  fg_short: { label: 'Field Goals (0–39 yds)', pointsPerUnit: 3 },
  fg_long: { label: 'Field Goals (40–49 yds)', pointsPerUnit: 4 },
  fg_50: { label: 'Field Goals (50+ yds)', pointsPerUnit: 5 },
  pat: { label: 'Extra Points Made', pointsPerUnit: 1 },
  sacks: { label: 'Sacks', pointsPerUnit: 1 },
  def_int: { label: 'Interceptions', pointsPerUnit: 2 },
  fumble_rec: { label: 'Fumble Recoveries', pointsPerUnit: 2 },
  def_td: { label: 'Defensive Touchdowns', pointsPerUnit: 6 },
  pts_allowed_score: { label: 'Points Allowed (bonus)', pointsPerUnit: 1 }, // pre-scored bucket avg
};

const POSITION_CATEGORIES = {
  QB: ['pass_yards', 'pass_td', 'interceptions', 'rush_yards', 'rush_td', 'fumbles_lost'],
  RB: ['rush_yards', 'rush_td', 'receptions', 'rec_yards', 'rec_td', 'fumbles_lost'],
  WR: ['receptions', 'rec_yards', 'rec_td', 'rush_yards', 'rush_td', 'fumbles_lost'],
  TE: ['receptions', 'rec_yards', 'rec_td', 'fumbles_lost'],
  K: ['fg_short', 'fg_long', 'fg_50', 'pat'],
  DEF: ['sacks', 'def_int', 'fumble_rec', 'def_td', 'pts_allowed_score'],
};

// Positions with real historical stats tracked (see ml/fetch_real_data.py).
// K and DEF don't have a real data source wired up yet, so they're never
// filtered by "did this player play recently" — there's nothing to check
// them against. Once a real K/DEF data source exists, add them here.
const REAL_DATA_POSITIONS = ['QB', 'RB', 'WR', 'TE'];

module.exports = { SCORING, POSITION_CATEGORIES, REAL_DATA_POSITIONS };