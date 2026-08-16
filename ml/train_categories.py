"""
Trains one small neural network per position (QB, RB, WR, TE) that predicts
ALL of that position's scoring categories at once — e.g. the RB model outputs
[rush_yards, rush_td, receptions, rec_yards, rec_td, fumbles_lost] together —
from the player's rolling average in each of those categories over their
previous 3 games.

This is what should actually be powering player_projected_stats (and, by
extension, the Selector's category-weighted rankings), replacing the SQL
approximation from seed_player_stats.sql.

Usage:
    python train_categories.py
Requires player_category_stats_history to be populated first (see
fetch_real_data.py + import_category_stats.py).
Saves one file per position: model_QB.joblib, model_RB.joblib, etc.
"""
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

from db import get_connection
from scoring_config import POSITION_CATEGORIES, REAL_DATA_POSITIONS

ROLLING_WINDOW = 3
MIN_ROWS_TO_TRAIN = 30


def load_category_history(cur, position):
    cur.execute(
        """
        SELECT h.player_id, h.season, h.week, h.stat_key, h.stat_value
        FROM player_category_stats_history h
        JOIN players p ON p.id = h.player_id
        WHERE p.position = %s
        ORDER BY h.player_id, h.season, h.week
        """,
        (position,),
    )
    rows = cur.fetchall()
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    # Long -> wide: one row per player-week, one column per stat_key.
    return df.pivot_table(
        index=["player_id", "season", "week"], columns="stat_key", values="stat_value", fill_value=0
    ).reset_index()


def build_features(df: pd.DataFrame, stat_keys: list) -> pd.DataFrame:
    df = df.sort_values(["player_id", "season", "week"]).copy()
    for key in stat_keys:
        if key not in df.columns:
            df[key] = 0.0
        df[f"{key}_avg"] = (
            df.groupby("player_id")[key]
            .transform(lambda s: s.shift(1).rolling(ROLLING_WINDOW, min_periods=ROLLING_WINDOW).mean())
        )
    feature_cols = [f"{key}_avg" for key in stat_keys]
    return df.dropna(subset=feature_cols)


def train_position(cur, position):
    stat_keys = POSITION_CATEGORIES[position]
    raw = load_category_history(cur, position)

    if raw.empty:
        print(f"[{position}] No history found — skipping. Run fetch_real_data.py + import_category_stats.py first.")
        return

    features_df = build_features(raw, stat_keys)
    if len(features_df) < MIN_ROWS_TO_TRAIN:
        print(f"[{position}] Only {len(features_df)} trainable rows (need {MIN_ROWS_TO_TRAIN}+). Import more seasons/weeks.")
        return

    X = features_df[[f"{key}_avg" for key in stat_keys]].to_numpy()
    y = features_df[stat_keys].to_numpy()  # multi-output target

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = MLPRegressor(
        hidden_layer_sizes=(32, 16),
        activation="relu",
        max_iter=3000,
        random_state=42,
        early_stopping=True,
    )
    model.fit(X_train_scaled, y_train)

    preds = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, preds)  # averaged across all categories
    print(f"[{position}] Trained on {len(X_train)} rows. Avg MAE across categories: {mae:.2f}")

    joblib.dump({"model": model, "scaler": scaler, "stat_keys": stat_keys}, f"model_{position}.joblib")
    print(f"[{position}] Saved model_{position}.joblib")


def main():
    conn = get_connection()
    cur = conn.cursor()
    for position in REAL_DATA_POSITIONS:  # QB, RB, WR, TE — see scoring_config.py
        train_position(cur, position)
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()