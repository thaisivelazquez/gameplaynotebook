"""
Pull real weekly offensive stats (QB/RB/WR/TE) straight from nflverse's
GitHub release and write them out in the "long format"
import_category_stats.py expects:
    player_name, position, nfl_team, season, week, stat_key, stat_value

Usage:
    python fetch_real_data.py 2023 2024 2025
    (pass one or more season years; each season is a full year of weekly data)

NOTE: this reads the parquet files directly rather than going through
nfl_data_py's import_weekly_data(), because nflverse renamed their release
from "player_stats" to "stats_player" in Jan 2026 and nfl_data_py (as of
0.3.3) hasn't been updated to match yet. If nfl_data_py releases a fix later,
you can switch back to `nfl.import_weekly_data(seasons)` — the column names
below would need to move back to the old names too (see comments).
"""
import sys
import pandas as pd

from scoring_config import REAL_DATA_POSITIONS

URL_TEMPLATE = "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{0}.parquet"

# Current (2026+) column names -> our stat_key names.
# If nfl_data_py fixes their URL and you switch to import_weekly_data(), the
# source column for interceptions goes back to 'interceptions' (not
# 'passing_interceptions'), and 'team' goes back to 'recent_team'.
STAT_COLUMN_MAP = {
    "passing_yards": "pass_yards",
    "passing_tds": "pass_td",
    "passing_interceptions": "interceptions",
    "rushing_yards": "rush_yards",
    "rushing_tds": "rush_td",
    "receptions": "receptions",
    "receiving_yards": "rec_yards",
    "receiving_tds": "rec_td",
}

FUMBLE_COLUMNS = ["sack_fumbles_lost", "rushing_fumbles_lost", "receiving_fumbles_lost"]


def main(seasons):
    frames = []
    for year in seasons:
        url = URL_TEMPLATE.format(year)
        print(f"Downloading {url} ...")
        frames.append(pd.read_parquet(url))
    df = pd.concat(frames, ignore_index=True)

    df = df[df["position"].isin(REAL_DATA_POSITIONS)].copy()
    df["fumbles_lost"] = df[[c for c in FUMBLE_COLUMNS if c in df.columns]].sum(axis=1)

    stat_cols = {**STAT_COLUMN_MAP, "fumbles_lost": "fumbles_lost"}

    rows = []
    for _, row in df.iterrows():
        base = {
            "player_name": row.get("player_display_name") or row.get("player_name"),
            "position": row["position"],
            "nfl_team": row.get("team") or row.get("recent_team"),
            "season": int(row["season"]),
            "week": int(row["week"]),
        }
        if not base["player_name"] or not base["nfl_team"]:
            continue

        for source_col, stat_key in stat_cols.items():
            value = row.get(source_col)
            if pd.isna(value):
                continue
            rows.append({**base, "stat_key": stat_key, "stat_value": float(value)})

    out = pd.DataFrame(rows)
    out.to_csv("real_stats_long.csv", index=False)
    print(f"Wrote {len(out)} rows to real_stats_long.csv covering {out['player_name'].nunique()} players.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python fetch_real_data.py <season> [season ...]  e.g. python fetch_real_data.py 2023 2024 2025")
    seasons = [int(s) for s in sys.argv[1:]]
    main(seasons)