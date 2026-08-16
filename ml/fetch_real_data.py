"""
Pull real weekly offensive stats (QB/RB/WR/TE) from nfl_data_py and write them
out in the "long format" import_category_stats.py expects:
    player_name, position, nfl_team, season, week, stat_key, stat_value

Usage:
    python fetch_real_data.py 2023 2024 2025
    (pass one or more season years; each season is a full year of weekly data)

Requires: pip install nfl_data_py
"""
import sys
import pandas as pd
import nfl_data_py as nfl

from scoring_config import REAL_DATA_POSITIONS

# Maps nfl_data_py's column names -> our stat_key names.
STAT_COLUMN_MAP = {
    "passing_yards": "pass_yards",
    "passing_tds": "pass_td",
    "interceptions": "interceptions",
    "rushing_yards": "rush_yards",
    "rushing_tds": "rush_td",
    "receptions": "receptions",
    "receiving_yards": "rec_yards",
    "receiving_tds": "rec_td",
}

# These three get summed into a single 'fumbles_lost' stat_key.
FUMBLE_COLUMNS = ["sack_fumbles_lost", "rushing_fumbles_lost", "receiving_fumbles_lost"]


def main(seasons):
    print(f"Downloading weekly data for seasons: {seasons} (this can take a minute)...")
    df = nfl.import_weekly_data(seasons)

    df = df[df["position"].isin(REAL_DATA_POSITIONS)].copy()
    df["fumbles_lost"] = df[[c for c in FUMBLE_COLUMNS if c in df.columns]].sum(axis=1)

    stat_cols = {**STAT_COLUMN_MAP, "fumbles_lost": "fumbles_lost"}

    rows = []
    for _, row in df.iterrows():
        base = {
            "player_name": row.get("player_display_name") or row.get("player_name"),
            "position": row["position"],
            "nfl_team": row.get("recent_team") or row.get("team"),
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