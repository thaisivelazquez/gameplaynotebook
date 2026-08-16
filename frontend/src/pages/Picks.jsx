import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import GameCard from '../components/GameCard.jsx';

export default function Picks() {
  const { auth } = useAuth();
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [gamesData, picksData] = await Promise.all([
        api.getGames(),
        api.getMyPicks(auth.token),
      ]);
      setGames(gamesData);
      setPicks(picksData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave(payload) {
    await api.savePick(payload, auth.token);
    await loadData();
  }

  const pickByGame = Object.fromEntries(picks.map((p) => [p.game_id, p]));
  const weeks = [...new Set(games.map((g) => g.week))].sort((a, b) => a - b);

  return (
    <div>
      <h1 className="page-title">Make Your Calls</h1>
      <p className="page-sub">Pick the winner and, if you're feeling bold, the final score.</p>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-state">Loading games…</div>}

      {!loading && games.length === 0 && (
        <div className="empty-state">No games scheduled yet. Check back once the slate is set.</div>
      )}

      {weeks.map((week) => (
        <div key={week} style={{ marginBottom: 32 }}>
          <div className="week-eyebrow">Week {week}</div>
          {games
            .filter((g) => g.week === week)
            .map((game) => (
              <GameCard key={game.id} game={game} existingPick={pickByGame[game.id]} onSave={handleSave} />
            ))}
        </div>
      ))}
    </div>
  );
}
