import React, { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import InjuryBadge from '../components/InjuryBadge.jsx';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const FLEX_ELIGIBLE = ['RB', 'WR', 'TE'];

function eligibleOpenSlots(player, lineup) {
  return lineup.filter((entry) => {
    if (entry.player) return false;
    if (entry.position === 'FLEX') return FLEX_ELIGIBLE.includes(player.position);
    if (entry.position === 'BENCH') return true;
    return entry.position === player.position;
  });
}

function weightLabel(weight) {
  if (weight === 1.5) return 'Prioritized';
  if (weight === 0.5) return 'Deprioritized';
  return 'Neutral';
}

const selectStyle = {
  border: '1px solid var(--line)',
  color: 'var(--ink)',
  borderRadius: 4,
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'inherit',
};

export default function Selector() {
  const { auth } = useAuth();
  const [position, setPosition] = useState(null);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState({});
  const [ranked, setRanked] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [roster, setRoster] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

async function handlePickPosition(pos) {
    setPosition(pos);
    setRanked(null);
    setPriorities({});
    setError('');
    setLoading(true);
    try {
      const [catData, rosterData] = await Promise.all([
        api.getCategories(pos),
        api.getRoster(auth.token),
      ]);
      setCategories(catData.categories);
      setRoster(rosterData);
      setPriorities(Object.fromEntries(catData.categories.map((cat) => [cat.key, true])));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function togglePriority(key, value) {
    setPriorities((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRank() {
    setLoading(true);
    setError('');
    try {
      const result = await api.rankPlayers({ position, priorities });
      setRanked(result.ranked);
      setCarouselIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(player) {
    const slots = eligibleOpenSlots(player, roster.lineup);
    const slot = selectedSlot[player.id] || slots[0]?.slot;
    if (!slot) return;

    setSavingId(player.id);
    setError('');
    try {
      await api.setRosterSlot({ slot, player_id: player.id }, auth.token);
      const rosterData = await api.getRoster(auth.token);
      setRoster(rosterData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  const current = ranked && ranked.length > 0 ? ranked[carouselIndex] : null;
  const currentSlots = current && roster ? eligibleOpenSlots(current, roster.lineup) : [];
  const currentHasOpenSlot = currentSlots.length > 0;

  return (
    <div>
      <h1 className="page-title">Player Selector</h1>
      <p className="page-sub">
        Pick a position, tell us what stats matter most to you, then flip through your best
        options â€” top pick first.
      </p>

      {error && <div className="error-msg">{error}</div>}

      <div className="week-eyebrow">1. Choose a position</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            className={`option-btn ${position === pos ? 'selected' : ''}`}
            onClick={() => handlePickPosition(pos)}
          >
            {pos}
          </button>
        ))}
      </div>

      {position && categories.length > 0 && (
        <>
          <div className="week-eyebrow">2. What matters most for your {position}?</div>
          {categories.map((cat) => (
            <div key={cat.key} className="stat-row">
              <span className="stat-row-label">{cat.label}</span>
              <div className="radio-pair">
                <label className="radio-option">
                  Yes
                  <span
                    className={`radio-circle ${priorities[cat.key] === true ? 'checked' : ''}`}
                    onClick={() => togglePriority(cat.key, true)}
                  />
                </label>
                <label className="radio-option">
                  No
                  <span
                    className={`radio-circle ${priorities[cat.key] === false ? 'checked' : ''}`}
                    onClick={() => togglePriority(cat.key, false)}
                  />
                </label>
              </div>
            </div>
          ))}

          <button className="primary-btn" onClick={handleRank} disabled={loading} style={{ marginTop: 8, marginBottom: 32 }}>
            {loading ? 'Rankingâ€¦' : 'Show me my best options'}
          </button>
        </>
      )}

      {ranked && ranked.length === 0 && (
        <div className="empty-state">No {position} players found in the pool yet.</div>
      )}

      {current && (
        <div>
          <div className="week-eyebrow">
            3. Your best {position} options â€” {carouselIndex + 1} of {ranked.length}
          </div>

          <div className="carousel-row" style={{ marginBottom: 16 }}>
            <button
              className="carousel-arrow"
              onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
              disabled={carouselIndex === 0}
              aria-label="Previous player"
            >
              â†
            </button>

            <div className="carousel-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>
                    #{carouselIndex + 1} {current.name}
                    <InjuryBadge status={current.injury_status} note={current.injury_note} />
                  </div>
                  <div style={{ color: 'var(--ink-dim)', fontSize: 14, marginTop: 4 }}>
                    {current.position} Â· {current.nfl_team} Â· {current.final_score} weighted pts
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-dim)' }}>
                  Reliability: {current.reliability}/5
                  <br />
                  {current.reliability_label}
                </div>
              </div>

              <table className="data-table" style={{ marginTop: 20 }}>
                <thead>
                  <tr>
                    <th>Stat</th>
                    <th>Projected</th>
                    <th>Weighting</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {current.category_breakdown.map((row) => (
                    <tr key={row.key}>
                      <td style={{ color: 'var(--ink-dim)' }}>{row.label}</td>
                      <td>{row.statValue}</td>
                      <td>{weightLabel(row.weight)}</td>
                      <td>
                        {row.pointsContribution > 0 ? '+' : ''}
                        {row.pointsContribution}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {currentHasOpenSlot ? (
                  <>
                    <select
                      value={selectedSlot[current.id] || currentSlots[0].slot}
                      onChange={(e) =>
                        setSelectedSlot((prev) => ({ ...prev, [current.id]: e.target.value }))
                      }
                      style={selectStyle}
                    >
                      {currentSlots.map((s) => (
                        <option key={s.slot} value={s.slot}>
                          {s.slot}
                        </option>
                      ))}
                    </select>
                    <button
                      className="primary-btn"
                      onClick={() => handleAdd(current)}
                      disabled={savingId === current.id}
                    >
                      {savingId === current.id ? 'Recruitingâ€¦' : 'Recruit'}
                    </button>
                  </>
                ) : (
                  <span className="status-pill">No open slot</span>
                )}
              </div>
            </div>

            <button
              className="carousel-arrow"
              onClick={() => setCarouselIndex((i) => Math.min(ranked.length - 1, i + 1))}
              disabled={carouselIndex === ranked.length - 1}
              aria-label="Next player"
            >
              â†’
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
