import React, { useState } from 'react';

export default function GameCard({ game, existingPick, onSave }) {
  const [pickedTeam, setPickedTeam] = useState(existingPick?.picked_team || null);
  const [homeScore, setHomeScore] = useState(existingPick?.predicted_home_score ?? '');
  const [awayScore, setAwayScore] = useState(existingPick?.predicted_away_score ?? '');
  const [saving, setSaving] = useState(false);

  const locked = new Date(game.kickoff_time) <= new Date();
  const isFinal = game.status === 'final';

  async function handleSave() {
    if (!pickedTeam) return;
    setSaving(true);
    try {
      await onSave({
        game_id: game.id,
        picked_team: pickedTeam,
        predicted_home_score: homeScore === '' ? null : Number(homeScore),
        predicted_away_score: awayScore === '' ? null : Number(awayScore),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="game-card">
      <div className="matchup-row">
        <div>
          <div className="matchup-teams">
            {game.away_team} <span className="at">@</span> {game.home_team}
          </div>
          <div className="kickoff">
            {new Date(game.kickoff_time).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
        <span className={`status-pill ${isFinal ? 'final' : ''}`}>
          {isFinal ? `Final ${game.away_score}-${game.home_score}` : locked ? 'Locked' : 'Open'}
        </span>
      </div>

      <div className="pick-controls">
        <button
          className={`team-btn ${pickedTeam === game.away_team ? 'selected' : ''}`}
          disabled={locked}
          onClick={() => setPickedTeam(game.away_team)}
        >
          {game.away_team} to win
        </button>
        <button
          className={`team-btn ${pickedTeam === game.home_team ? 'selected' : ''}`}
          disabled={locked}
          onClick={() => setPickedTeam(game.home_team)}
        >
          {game.home_team} to win
        </button>

        <div className="score-inputs">
          <input
            type="number"
            placeholder={game.away_team}
            value={awayScore}
            disabled={locked}
            onChange={(e) => setAwayScore(e.target.value)}
          />
          <span>–</span>
          <input
            type="number"
            placeholder={game.home_team}
            value={homeScore}
            disabled={locked}
            onChange={(e) => setHomeScore(e.target.value)}
          />
        </div>

        {!locked && (
          <button className="save-btn" onClick={handleSave} disabled={!pickedTeam || saving}>
            {saving ? 'Saving…' : existingPick ? 'Update pick' : 'Save pick'}
          </button>
        )}
      </div>

      {existingPick && (
        <div className="pick-summary">
          Your call: {existingPick.picked_team} to win
          {existingPick.predicted_away_score != null &&
            ` · ${existingPick.predicted_away_score}-${existingPick.predicted_home_score}`}
          {isFinal && <span className="points-badge">+{existingPick.points_earned} pts</span>}
        </div>
      )}
    </div>
  );
}
