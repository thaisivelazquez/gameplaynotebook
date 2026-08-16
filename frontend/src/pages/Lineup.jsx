import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import InjuryBadge from '../components/InjuryBadge.jsx';

const GROUP_LABELS = {
  QB: 'Quarterback',
  RB: 'Running Back',
  WR: 'Wide Receiver',
  TE: 'Tight End',
  FLEX: 'Flex (RB/WR/TE)',
  K: 'Kicker',
  DEF: 'Defense',
  BENCH: 'Bench',
};

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

  // Group slots by their base position for display (RB1/RB2 -> one "Running Back" section)
  const groups = [];
  if (data) {
    for (const entry of data.lineup) {
      let group = groups.find((g) => g.key === entry.position);
      if (!group) {
        group = { key: entry.position, label: GROUP_LABELS[entry.position] || entry.position, entries: [] };
        groups.push(group);
      }
      group.entries.push(entry);
    }
  }

  return (
    <div>
      <h1 className="page-title">My Lineup</h1>
      <p className="page-sub">
        {loading
          ? 'Loading…'
          : `${filledCount} of ${totalSlots} slots filled · edit your format on the Rules tab`}
      </p>

      {error && <div className="error-msg">{error}</div>}

      {!loading && isEmpty && (
        <div className="game-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div className="matchup-teams" style={{ fontSize: 18, justifyContent: 'center' }}>
            You haven't built a lineup yet
          </div>
          <p style={{ color: 'var(--chalk-dim)', fontSize: 14, margin: '10px 0 20px' }}>
            Get a recommended lineup based on top projected players, then fine-tune it in the
            Selector.
          </p>
          <button className="save-btn" onClick={handleRecommend} disabled={recommending}>
            {recommending ? 'Building your lineup…' : 'Get recommended lineup'}
          </button>
        </div>
      )}

      {!loading &&
        !isEmpty &&
        groups.map((group) => (
          <div key={group.key} style={{ marginBottom: 28 }}>
            <div className="week-eyebrow">{group.label}</div>
            {group.entries.map(({ slot, player }) => (
              <div key={slot} className="game-card" style={{ padding: '14px 20px' }}>
                <div className="matchup-row">
                  <div>
                    {player ? (
                      <>
                        <div className="matchup-teams" style={{ fontSize: 16 }}>
                          {player.name}
                          <InjuryBadge status={player.injury_status} note={player.injury_note} />
                        </div>
                        <div className="kickoff">
                          {player.position} · {player.nfl_team} · {player.projected_points} proj. pts
                        </div>
                      </>
                    ) : (
                      <div className="kickoff">{slot} — empty</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to="/selector" className="team-btn" style={{ textDecoration: 'none' }}>
                      {player ? 'Swap' : 'Fill slot'}
                    </Link>
                    {player && (
                      <button className="team-btn" onClick={() => handleClear(slot)}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

      {!loading && !isEmpty && (
        <button className="team-btn" onClick={handleRecommend} disabled={recommending}>
          {recommending ? 'Rebuilding…' : 'Re-run recommended lineup'}
        </button>
      )}
    </div>
  );
}