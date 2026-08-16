import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';

const FIELDS = [
  { key: 'qb_slots', label: 'Quarterback' },
  { key: 'rb_slots', label: 'Running Back' },
  { key: 'wr_slots', label: 'Wide Receiver' },
  { key: 'te_slots', label: 'Tight End' },
  { key: 'flex_slots', label: 'Flex (RB/WR/TE)' },
  { key: 'k_slots', label: 'Kicker' },
  { key: 'def_slots', label: 'Defense' },
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

  return (
    <div>
      <h1 className="page-title">Rule Page</h1>
      <p className="page-sub">
        Set how many players start at each position. This reshapes your Lineup and Selector
        immediately.
      </p>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-state">Loading…</div>}

      {form && (
        <form onSubmit={handleSave}>
          <table className="rules-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Number of slots</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(({ key, label }) => (
                <tr key={key}>
                  <th>{label}</th>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={form[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save rules'}
          </button>
          {saved && (
            <p style={{ color: 'var(--accent)', fontSize: 13, marginTop: 10 }}>
              Saved — check your Lineup to see the updated slots.
            </p>
          )}
        </form>
      )}
    </div>
  );
}