"""
Train a small neural network (MLPRegressor) to predict a player's next-week
fantasy points from their recent rolling average and position.

Usage:
    python train.py
Requires player_stats_history to already be populated (see import_stats.py).
Saves model.joblib (model + scaler bundled together) for use by service.py /
update_projections.py.
"""
import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

from db import get_connection
from features import load_history_dataframe, build_training_features, make_feature_vector

MODEL_PATH = "model.joblib"
MIN_ROWS_TO_TRAIN = 30


def main():
    conn = get_connection()
    cur = conn.cursor()
    raw = load_history_dataframe(cur)
    cur.close()
    conn.close()

    if raw.empty:
        raise SystemExit(
            "No rows in player_stats_history yet. Run import_stats.py with a real "
            "weekly stats CSV first."
        )

    features_df = build_training_features(raw)

    if len(features_df) < MIN_ROWS_TO_TRAIN:
        raise SystemExit(
            f"Only {len(features_df)} trainable rows found (need each player to have "
            f"at least 4 weeks of history: 3 to average + 1 to predict). Import more "
            f"weeks of data and try again."
        )

    X = np.array(
        [make_feature_vector(row.rolling_avg, row.position) for row in features_df.itertuples()]
    )
    y = features_df["fantasy_points"].to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = MLPRegressor(
        hidden_layer_sizes=(16, 8),
        activation="relu",
        max_iter=2000,
        random_state=42,
        early_stopping=True,
    )
    model.fit(X_train_scaled, y_train)

    preds = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, preds)

    print(f"Trained on {len(X_train)} rows, tested on {len(X_test)} rows.")
    print(f"Mean absolute error on held-out weeks: {mae:.2f} fantasy points")

    joblib.dump({"model": model, "scaler": scaler}, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
