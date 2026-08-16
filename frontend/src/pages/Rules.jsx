import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';

const FIELDS = [
  { key: 'qb_slots', label: 'Quarterbacks' },
  { key: 'rb_slots', label: 'Running Backs' },
  { key: 'wr_slots', label: 'Wide Receivers' },
  { key: 'te_slots', label: 'Tight Ends' },
  { key: 'flex_slots', label: 'Flex (RB/WR/TE)' },
  { key: 'k_slots', label: 'Kickers' },
  { key: 'def_slots', label: 'Defenses' },
  { key: 'bench_slots', label: 'Bench' },
];

export default function Rules() {
  const { auth } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getRules(auth.token)
      .then(setForm)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [auth.token]);

  function handleChange(key, value) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.saveRules(form, auth.token);
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalStarters = form
    ? ['qb_slots', 'rb_slots', 'wr_slots', 'te_slots', 'flex_slots', 'k_slots', 'def_slots'].reduce(
        (sum, key) => sum + Number(form[key] || 0),
        0
      )
    : 0;

  return (
    <div>
      <h1 className="page-title">League Rules</h1>
      <p className="page-sub">
        Set how many players start at each position. This reshapes your Lineup and Selector
        immediately — slots that no longer exist are dropped, new ones open up empty.
      </p>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-state">Loading…</div>}

      {form && (
        <form onSubmit={handleSave} className="game-card" style={{ maxWidth: 460 }}>
          {FIELDS.map(({ key, label }) => (
            <div className="form-field" key={key}>
              <label htmlFor={key}>{label}</label>
              <input
                id={key}
                type="number"
                min={0}
                max={10}
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}

          <p style={{ color: 'var(--chalk-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            {totalStarters} starting slots + {form.bench_slots} bench
          </p>

          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save rules'}
          </button>
          {saved && (
            <p style={{ color: 'var(--win)', fontSize: 13, marginTop: 10 }}>
              Saved — check your Lineup to see the updated slots.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
