"""
Pull the latest real NFL injury report for a season and write each player's
current status onto the players table (injury_status, injury_note,
injury_updated_at).

Only positions already in your player pool get matched — this doesn't add
new players, it just tags existing ones.

Usage:
    python fetch_injuries.py 2025
    (pass the season year; injury reports are weekly, this always keeps
    only each player's MOST RECENT reported status for that season)

Requires: pip install nfl_data_py (already in requirements.txt)
"""
import sys
import pandas as pd
import nfl_data_py as nfl

from db import get_connection

# nfl_data_py's report_status -> our injury_status values
STATUS_MAP = {
    "Questionable": "questionable",
    "Doubtful": "doubtful",
    "Out": "out",
}


def main(season):
    print(f"Downloading injury reports for {season}...")
    df = nfl.import_injuries([season])
    df = df[df["report_status"].notna()].copy()

    if df.empty:
        print(f"No injury reports found for {season} yet.")
        return

    # Keep only each player's latest reported week this season.
    latest = df.sort_values("week").groupby("full_name", as_index=False).last()

    conn = get_connection()
    cur = conn.cursor()

    matched, unmatched = 0, 0
    for _, row in latest.iterrows():
        status = STATUS_MAP.get(row["report_status"])
        if not status:
            continue

        cur.execute(
            """
            UPDATE players
            SET injury_status = %s, injury_note = %s, injury_updated_at = NOW()
            WHERE name = %s AND position = %s
            """,
            (status, row.get("report_primary_injury"), row["full_name"], row["position"]),
        )
        if cur.rowcount > 0:
            matched += 1
        else:
            unmatched += 1

    # Anyone not on this week's report is presumed healthy — clear stale statuses
    # for players whose last known status is now outdated (older than 10 days).
    cur.execute(
        """
        UPDATE players
        SET injury_status = NULL, injury_note = NULL
        WHERE injury_updated_at IS NOT NULL
          AND injury_updated_at < NOW() - INTERVAL '10 days'
        """
    )
    cleared = cur.rowcount

    conn.commit()
    cur.close()
    conn.close()

    print(
        f"Updated {matched} players with a current injury status "
        f"({unmatched} names in the report didn't match anyone in your player pool). "
        f"Cleared {cleared} stale statuses."
    )


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python fetch_injuries.py <season>  e.g. python fetch_injuries.py 2025")
    main(int(sys.argv[1]))