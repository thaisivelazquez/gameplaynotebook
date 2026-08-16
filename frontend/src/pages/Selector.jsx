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

function ReliabilityDots({ score }) {
  return (
    <span style={{ letterSpacing: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ color: n <= score ? 'var(--amber)' : 'var(--field-line)' }}>
          ●
        </span>
      ))}
    </span>
  );
}

const selectStyle = {
  background: 'var(--field-dark)',
  border: '1px solid var(--field-line)',
  color: 'var(--chalk)',
  borderRadius: 4,
  padding: '8px 10px',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
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
        options — top pick first.
      </p>

      {error && <div className="error-msg">{error}</div>}

      <div className="week-eyebrow">1. Choose a position</div>
      <div className="pick-controls" style={{ marginBottom: 24 }}>
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            className={`team-btn ${position === pos ? 'selected' : ''}`}
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
            <div key={cat.key} className="game-card" style={{ padding: '12px 20px' }}>
              <div className="matchup-row">
                <div className="matchup-teams" style={{ fontSize: 15 }}>
                  {cat.label}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`team-btn ${priorities[cat.key] === true ? 'selected' : ''}`}
                    onClick={() => togglePriority(cat.key, true)}
                  >
                    Prioritize: Yes
                  </button>
                  <button
                    className={`team-btn ${priorities[cat.key] === false ? 'selected' : ''}`}
                    onClick={() => togglePriority(cat.key, false)}
                  >
                    Prioritize: No
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button className="save-btn" onClick={handleRank} disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Ranking…' : 'Show my best options'}
          </button>
        </>
      )}

      {ranked && ranked.length === 0 && (
        <div className="empty-state" style={{ marginTop: 32 }}>
          No {position} players found in the pool yet.
        </div>
      )}

      {current && (
        <div style={{ marginTop: 32 }}>
          <div className="week-eyebrow">
            3. Your best {position} options — {carouselIndex + 1} of {ranked.length}
          </div>

          <div className="game-card" style={{ padding: '24px' }}>
            <div className="matchup-row">
              <div>
                <div className="matchup-teams" style={{ fontSize: 20 }}>
                  <span style={{ color: 'var(--amber)', marginRight: 10 }}>#{carouselIndex + 1}</span>
                  {current.name}
                  <InjuryBadge status={current.injury_status} note={current.injury_note} />
                </div>
                <div className="kickoff">
                  {current.position} · {current.nfl_team} · {current.final_score} weighted pts
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--chalk-dim)', marginBottom: 4 }}>
                  RELIABILITY
                </div>
                <ReliabilityDots score={current.reliability} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--chalk-dim)', marginTop: 2 }}>
                  {current.reliability}/5 · {current.reliability_label}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, borderTop: '1px dashed var(--field-line)', paddingTop: 16 }}>
              <div className="week-eyebrow" style={{ marginBottom: 10 }}>
                Score breakdown
              </div>
              {current.category_breakdown.map((row) => (
                <div
                  key={row.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--chalk-dim)' }}>{row.label}</span>
                  <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span>{row.statValue}</span>
                    <span
                      style={{
                        color:
                          row.weight === 1.5
                            ? 'var(--amber)'
                            : row.weight === 0.5
                            ? 'var(--chalk-dim)'
                            : 'var(--chalk)',
                      }}
                    >
                      {weightLabel(row.weight)}
                    </span>
                    <span style={{ minWidth: 44, textAlign: 'right' }}>
                      {row.pointsContribution > 0 ? '+' : ''}
                      {row.pointsContribution}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
                    className="save-btn"
                    onClick={() => handleAdd(current)}
                    disabled={savingId === current.id}
                  >
                    {savingId === current.id ? 'Adding…' : 'Add to lineup'}
                  </button>
                </>
              ) : (
                <span className="status-pill">No open slot</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button
              className="team-btn"
              onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
              disabled={carouselIndex === 0}
            >
              ← Previous
            </button>
            <button
              className="team-btn"
              onClick={() => setCarouselIndex((i) => Math.min(ranked.length - 1, i + 1))}
              disabled={carouselIndex === ranked.length - 1}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}