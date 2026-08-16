import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import InjuryBadge from '../components/InjuryBadge.jsx';

export default function Lineup() {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const roster = await api.getRoster(auth.token);
      setData(roster);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRecommend() {
    setRecommending(true);
    setError('');
    try {
      await api.recommendRoster(auth.token);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRecommending(false);
    }
  }

  async function handleClear(slot) {
    try {
      await api.clearRosterSlot(slot, auth.token);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const filledCount = data?.lineup.filter((s) => s.player).length ?? 0;
  const totalSlots = data?.lineup.length ?? 0;
  const isEmpty = data && filledCount === 0;

  return (
    <div>
      <h1 className="page-title">My Current Lineup</h1>
      <p className="page-sub">
        {loading
          ? 'Loading...'
          : `${filledCount} of ${totalSlots} slots filled | edit your format on the Rules tab`}
      </p>

      {error && <div className="error-msg">{error}</div>}

      {!loading && isEmpty && (
        <div className="box" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div className="week-eyebrow">You haven't built a lineup yet</div>
          <p style={{ color: 'var(--ink-dim)', fontSize: 14, margin: '10px 0 20px' }}>
            Get a recommended lineup based on top projected players, then fine-tune it in the
            Selector.
          </p>
          <button className="primary-btn" onClick={handleRecommend} disabled={recommending}>
            {recommending ? 'Building your lineup...' : 'Get recommended lineup'}
          </button>
        </div>
      )}

      {!loading && !isEmpty && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Name</th>
              <th>Team</th>
              <th>Position</th>
              <th>Injury Status</th>
              <th>Stats</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.lineup.map(({ slot, player }) => (
              <tr key={slot}>
                <td style={{ color: 'var(--ink-dim)' }}>{slot}</td>
                <td>{player ? player.name : ' - '}</td>
                <td>{player ? player.nfl_team : ' - '}</td>
                <td>{player ? player.position : ' - '}</td>
                <td>
                  {player && player.injury_status ? (
                    <InjuryBadge status={player.injury_status} note={player.injury_note} />
                  ) : player ? (
                    'Healthy'
                  ) : (
                    ' - '
                  )}
                </td>
                <td>{player ? `${player.projected_points} pts` : ' - '}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Link to="/selector" className="text-btn" style={{ marginRight: 12 }}>
                    {player ? 'Swap' : 'Fill'}
                  </Link>
                  {player && (
                    <button className="text-btn" onClick={() => handleClear(slot)}>
                      Clear
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && !isEmpty && (
        <button className="option-btn" onClick={handleRecommend} disabled={recommending}>
          {recommending ? 'Rebuilding...' : 'Re-run recommended lineup'}
        </button>
      )}
    </div>
  );
}