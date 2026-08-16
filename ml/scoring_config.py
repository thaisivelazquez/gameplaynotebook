"""
Mirrors backend/src/scoring.js. Keep these two in sync if you change league
scoring settings. Used here to convert predicted per-category stats into a
single fantasy point total for players.projected_points.
"""

SCORING = {
    "pass_yards": 1 / 25,
    "pass_td": 4,
    "interceptions": -1,
    "rush_yards": 1 / 10,
    "rush_td": 6,
    "receptions": 1,
    "rec_yards": 1 / 10,
    "rec_td": 6,
    "fumbles_lost": -2,
    "fg_short": 3,
    "fg_long": 4,
    "fg_50": 5,
    "pat": 1,
    "sacks": 1,
    "def_int": 2,
    "fumble_rec": 2,
    "def_td": 6,
    "pts_allowed_score": 1,
}

POSITION_CATEGORIES = {
    "QB": ["pass_yards", "pass_td", "interceptions", "rush_yards", "rush_td", "fumbles_lost"],
    "RB": ["rush_yards", "rush_td", "receptions", "rec_yards", "rec_td", "fumbles_lost"],
    "WR": ["receptions", "rec_yards", "rec_td", "rush_yards", "rush_td", "fumbles_lost"],
    "TE": ["receptions", "rec_yards", "rec_td", "fumbles_lost"],
    "K": ["fg_short", "fg_long", "fg_50", "pat"],
    "DEF": ["sacks", "def_int", "fumble_rec", "def_td", "pts_allowed_score"],
}

# Positions with a clean, reliable real-data source via nfl_data_py.
# K/DEF stats need a different data source and aren't covered by fetch_real_data.py yet.
REAL_DATA_POSITIONS = ["QB", "RB", "WR", "TE"]


def fantasy_points(stat_values: dict) -> float:
    """stat_values: {stat_key: value}. Returns total fantasy points."""
    return sum(stat_values.get(key, 0) * weight for key, weight in SCORING.items())