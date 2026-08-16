"""
Lightweight prediction service. Run alongside the Node backend:

    uvicorn service:app --port 8000 --reload

Endpoints:
    GET  /health              - liveness check
    GET  /predict/{player_id} - predicted next-week points for one player
    POST /update-all          - recompute projected_points for every player in the DB
"""
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException

from db import get_connection
from features import latest_rolling_avg, make_feature_vector

MODEL_PATH = "model.joblib"

app = FastAPI(title="NFL Pick'em Projection Service")


def load_model():
    try:
        return joblib.load(MODEL_PATH)
    except FileNotFoundError:
        return None


model_bundle = load_model()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model_bundle is not None}


@app.get("/predict/{player_id}")
def predict(player_id: int):
    if model_bundle is None:
        raise HTTPException(status_code=503, detail="Model not trained yet. Run train.py first.")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, name, position FROM players WHERE id = %s", (player_id,))
    player = cur.fetchone()

    if not player:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Player not found")

    avg = latest_rolling_avg(cur, player_id)
    cur.close()
    conn.close()

    if avg is None:
        raise HTTPException(
            status_code=422,
            detail="Not enough recorded history for this player (need at least 3 games).",
        )

    features = np.array([make_feature_vector(avg, player["position"])])
    features_scaled = model_bundle["scaler"].transform(features)
    predicted = float(model_bundle["model"].predict(features_scaled)[0])
    predicted = max(0.0, round(predicted, 1))

    return {
        "player_id": player_id,
        "name": player["name"],
        "position": player["position"],
        "recent_avg": round(avg, 1),
        "predicted_points": predicted,
    }


@app.post("/update-all")
def update_all():
    if model_bundle is None:
        raise HTTPException(status_code=503, detail="Model not trained yet. Run train.py first.")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, position FROM players")
    players = cur.fetchall()

    updated, skipped = 0, 0
    for player in players:
        avg = latest_rolling_avg(cur, player["id"])
        if avg is None:
            skipped += 1
            continue

        features = np.array([make_feature_vector(avg, player["position"])])
        features_scaled = model_bundle["scaler"].transform(features)
        predicted = max(0.0, round(float(model_bundle["model"].predict(features_scaled)[0]), 1))

        cur.execute("UPDATE players SET projected_points = %s WHERE id = %s", (predicted, player["id"]))
        updated += 1

    conn.commit()
    cur.close()
    conn.close()

    return {"updated": updated, "skipped": skipped}
