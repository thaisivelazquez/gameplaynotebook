"""
Import a long-format CSV of real weekly per-category stats (as produced by
fetch_real_data.py) into player_category_stats_history, and also roll each
player-week up into a single fantasy_points total in player_stats_history
(the table the original aggregate model in train.py uses).

Usage:
    python import_category_stats.py real_stats_long.csv
"""
import sys
from collections import defaultdict
import pandas as pd
from db import get_connection
from scoring_config import fantasy_points


def find_or_create_player(cur, name, position, team):
    cur.execute("SELECT id FROM players WHERE name = %s AND position = %s", (name, position))
    row = cur.fetchone()
    if row:
        return row["id"]

    cur.execute(
        """
        INSERT INTO players (name, position, nfl_team, projected_points)
        VALUES (%s, %s, %s, 0)
        RETURNING id
        """,
        (name, position, team),
    )
    return cur.fetchone()["id"]


def main(csv_path):
    df = pd.read_csv(csv_path)
    required = {"player_name", "position", "nfl_team", "season", "week", "stat_key", "stat_value"}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"CSV is missing required columns: {missing}")

    conn = get_connection()
    cur = conn.cursor()

    # Cache player_id lookups within this run so we don't hit the DB once per row.
    player_cache = {}
    category_rows = 0

    # Also build per-player-week totals for player_stats_history as we go.
    weekly_totals = defaultdict(dict)  # (player_id, season, week) -> {stat_key: value}

    for _, row in df.iterrows():
        key = (str(row["player_name"]).strip(), str(row["position"]).strip().upper())
        if key not in player_cache:
            player_cache[key] = find_or_create_player(
                cur, key[0], key[1], str(row["nfl_team"]).strip().upper()
            )
        player_id = player_cache[key]

        cur.execute(
            """
            INSERT INTO player_category_stats_history (player_id, season, week, stat_key, stat_value)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (player_id, season, week, stat_key)
            DO UPDATE SET stat_value = EXCLUDED.stat_value
            """,
            (player_id, int(row["season"]), int(row["week"]), row["stat_key"], float(row["stat_value"])),
        )
        category_rows += 1

        wk_key = (player_id, int(row["season"]), int(row["week"]))
        weekly_totals[wk_key][row["stat_key"]] = float(row["stat_value"])

    inserted_totals = 0
    for (player_id, season, week), stats in weekly_totals.items():
        points = round(fantasy_points(stats), 1)
        cur.execute(
            """
            INSERT INTO player_stats_history (player_id, season, week, fantasy_points)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (player_id, season, week)
            DO UPDATE SET fantasy_points = EXCLUDED.fantasy_points
            """,
            (player_id, season, week, points),
        )
        inserted_totals += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"Imported {category_rows} category rows and {inserted_totals} weekly fantasy-point totals.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python import_category_stats.py real_stats_long.csv")
    main(sys.argv[1])