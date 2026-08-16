import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getLeaderboard()
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title">Leaderboard</h1>
      <p className="page-sub">Ranked by total points across the season.</p>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-state">Loading…</div>}

      {!loading && rows.length > 0 && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="rank-cell">#</th>
              <th>Player</th>
              <th>Points</th>
              <th>Picks made</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.user_id}>
                <td className="rank-cell">{i + 1}</td>
                <td>{row.username}</td>
                <td>{row.total_points}</td>
                <td>{row.picks_made}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && rows.length === 0 && <div className="empty-state">No players yet.</div>}
    </div>
  );
}
