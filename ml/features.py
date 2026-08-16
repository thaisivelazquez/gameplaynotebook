"""
Shared feature-building logic so training and prediction use the exact same
feature definition. Kept intentionally simple: predict a player's next-week
fantasy points from their rolling average over their last 3 games, plus position.
"""
import pandas as pd
from db import ALL_POSITIONS

ROLLING_WINDOW = 3


def load_history_dataframe(cur):
    cur.execute(
        """
        SELECT h.player_id, p.position, h.season, h.week, h.fantasy_points
        FROM player_stats_history h
        JOIN players p ON p.id = h.player_id
        ORDER BY h.player_id, h.season, h.week
        """
    )
    rows = cur.fetchall()
    return pd.DataFrame(rows)


def build_training_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each player, compute the rolling average of fantasy points over their
    previous ROLLING_WINDOW games (not including the current game), then use
    that as the input feature to predict the current game's fantasy_points.
    Rows without enough history are dropped.
    """
    df = df.sort_values(["player_id", "season", "week"]).copy()
    df["rolling_avg"] = (
        df.groupby("player_id")["fantasy_points"]
        .transform(lambda s: s.shift(1).rolling(ROLLING_WINDOW, min_periods=ROLLING_WINDOW).mean())
    )
    return df.dropna(subset=["rolling_avg"])


def position_one_hot(position: str) -> list:
    return [1.0 if position == p else 0.0 for p in ALL_POSITIONS]


def make_feature_vector(rolling_avg: float, position: str) -> list:
    return [rolling_avg] + position_one_hot(position)


def latest_rolling_avg(cur, player_id: int):
    """Rolling average over a player's most recent ROLLING_WINDOW recorded games."""
    cur.execute(
        """
        SELECT fantasy_points FROM player_stats_history
        WHERE player_id = %s
        ORDER BY season DESC, week DESC
        LIMIT %s
        """,
        (player_id, ROLLING_WINDOW),
    )
    rows = cur.fetchall()
    if len(rows) < ROLLING_WINDOW:
        return None
    return sum(r["fantasy_points"] for r in rows) / len(rows)
