"""
Recompute both player_projected_stats (per-category) and players.projected_points
(aggregate) for every player.

For positions with a trained category model (model_QB.joblib etc, from
train_categories.py), predictions come from that model — real per-category
projections, not the SQL approximation.

For positions without one yet (K, DEF, or any position you haven't trained),
falls back to the original aggregate model (model.joblib, from train.py) for
projected_points only, leaving player_projected_stats untouched for those
players.

Usage:
    python update_projections.py
"""
import os
import joblib
import numpy as np

from db import get_connection
from features import latest_rolling_avg, make_feature_vector
from scoring_config import POSITION_CATEGORIES, REAL_DATA_POSITIONS, fantasy_points

AGGREGATE_MODEL_PATH = "model.joblib"


def load_category_models():
    models = {}
    for position in REAL_DATA_POSITIONS:
        path = f"model_{position}.joblib"
        if os.path.exists(path):
            models[position] = joblib.load(path)
    return models


def load_aggregate_model():
    if os.path.exists(AGGREGATE_MODEL_PATH):
        return joblib.load(AGGREGATE_MODEL_PATH)
    return None


def category_rolling_avgs(cur, player_id, stat_keys, window=3):
    avgs = {}
    for key in stat_keys:
        cur.execute(
            """
            SELECT stat_value FROM player_category_stats_history
            WHERE player_id = %s AND stat_key = %s
            ORDER BY season DESC, week DESC
            LIMIT %s
            """,
            (player_id, key, window),
        )
        rows = cur.fetchall()
        if len(rows) < window:
            return None
        avgs[key] = sum(r["stat_value"] for r in rows) / len(rows)
    return avgs


def main():
    category_models = load_category_models()
    aggregate_bundle = load_aggregate_model()

    if not category_models and not aggregate_bundle:
        raise SystemExit(
            "No trained models found. Run train_categories.py and/or train.py first."
        )

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, position FROM players")
    players = cur.fetchall()

    category_updates, aggregate_updates, skipped = 0, 0, 0

    for player in players:
        position = player["position"]
        used_category_model = False

        if position in category_models:
            bundle = category_models[position]
            stat_keys = bundle["stat_keys"]
            avgs = category_rolling_avgs(cur, player["id"], stat_keys)

            if avgs is not None:
                feature_row = np.array([[avgs[key] for key in stat_keys]])
                feature_scaled = bundle["scaler"].transform(feature_row)
                predicted = bundle["model"].predict(feature_scaled)[0]
                predicted = {key: max(0.0, round(float(v), 2)) for key, v in zip(stat_keys, predicted)}

                for key, value in predicted.items():
                    cur.execute(
                        """
                        INSERT INTO player_projected_stats (player_id, stat_key, stat_value)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (player_id, stat_key) DO UPDATE SET stat_value = EXCLUDED.stat_value
                        """,
                        (player["id"], key, value),
                    )
                category_updates += 1
                used_category_model = True

                # Derive projected_points straight from the predicted categories,
                # so the two numbers stay consistent with each other.
                points = round(fantasy_points(predicted), 1)
                cur.execute("UPDATE players SET projected_points = %s WHERE id = %s", (points, player["id"]))
                aggregate_updates += 1

        if not used_category_model and aggregate_bundle:
            avg = latest_rolling_avg(cur, player["id"])
            if avg is not None:
                features = np.array([make_feature_vector(avg, position)])
                features_scaled = aggregate_bundle["scaler"].transform(features)
                predicted_points = max(0.0, round(float(aggregate_bundle["model"].predict(features_scaled)[0]), 1))
                cur.execute("UPDATE players SET projected_points = %s WHERE id = %s", (predicted_points, player["id"]))
                aggregate_updates += 1
            else:
                skipped += 1
        elif not used_category_model:
            skipped += 1

    conn.commit()
    cur.close()
    conn.close()

    print(
        f"Updated player_projected_stats for {category_updates} players (real per-category model). "
        f"Updated projected_points for {aggregate_updates} players total. "
        f"Skipped {skipped} (not enough history)."
    )


if __name__ == "__main__":
    main()