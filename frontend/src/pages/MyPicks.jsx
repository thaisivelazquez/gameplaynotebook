import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';

export default function MyPicks() {
  const { auth } = useAuth();
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getMyPicks(auth.token)
      .then(setPicks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [auth.token]);

  const totalPoints = picks.reduce((sum, p) => sum + (p.points_earned || 0), 0);

  return (
    <div>
      <h1 className="page-title">My Picks</h1>
      <p className="page-sub">
        {picks.length} pick{picks.length === 1 ? '' : 's'} made · {totalPoints} total points
      </p>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-state">Loading…</div>}

      {!loading && picks.length === 0 && (
        <div className="empty-state">You haven't made any picks yet. Head to Picks to get started.</div>
      )}

      {picks.map((p) => (
        <div key={p.id} className="game-card">
          <div className="matchup-row">
            <div>
              <div className="matchup-teams">
                {p.away_team} <span className="at">@</span> {p.home_team}
              </div>
              <div className="kickoff">Week {p.week}</div>
            </div>
            <span className={`status-pill ${p.status === 'final' ? 'final' : ''}`}>
              {p.status === 'final' ? `Final ${p.away_score}-${p.home_score}` : 'Pending'}
            </span>
          </div>
          <div className="pick-summary">
            Your call: {p.picked_team} to win
            {p.predicted_away_score != null && ` · ${p.predicted_away_score}-${p.predicted_home_score}`}
            {p.status === 'final' && <span className="points-badge">+{p.points_earned} pts</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
