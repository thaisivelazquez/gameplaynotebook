"""
Import real weekly fantasy stats into the database.

Expected CSV columns (rename your source data to match, or edit COLUMN_MAP below):
    player_name, position, nfl_team, season, week, fantasy_points

Usage:
    python import_stats.py path/to/weekly_stats.csv
"""
import sys
import pandas as pd
from db import get_connection

# Map your CSV's column names (right side) to what this script expects (left side).
# Edit this if your data source uses different headers.
COLUMN_MAP = {
    "player_name": "player_name",
    "position": "position",
    "nfl_team": "nfl_team",
    "season": "season",
    "week": "week",
    "fantasy_points": "fantasy_points",
}


def find_or_create_player(cur, name, position, team):
    cur.execute(
        "SELECT id FROM players WHERE name = %s AND position = %s",
        (name, position),
    )
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
    df = df.rename(columns={v: k for k, v in COLUMN_MAP.items()})

    required = set(COLUMN_MAP.keys())
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(
            f"CSV is missing required columns: {missing}. "
            f"Either rename your columns or update COLUMN_MAP in import_stats.py."
        )

    conn = get_connection()
    cur = conn.cursor()

    inserted, updated = 0, 0
    for _, row in df.iterrows():
        player_id = find_or_create_player(
            cur, str(row["player_name"]).strip(), str(row["position"]).strip().upper(), str(row["nfl_team"]).strip().upper()
        )

        cur.execute(
            """
            INSERT INTO player_stats_history (player_id, season, week, fantasy_points)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (player_id, season, week)
            DO UPDATE SET fantasy_points = EXCLUDED.fantasy_points
            RETURNING (xmax = 0) AS inserted
            """,
            (player_id, int(row["season"]), int(row["week"]), float(row["fantasy_points"])),
        )
        if cur.fetchone()["inserted"]:
            inserted += 1
        else:
            updated += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"Done. {inserted} rows inserted, {updated} rows updated.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python import_stats.py path/to/weekly_stats.csv")
    main(sys.argv[1])
