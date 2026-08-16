import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <div className="week-eyebrow">Welcome to the huddle</div>
      <h1 className="page-title">Gridiron Calls</h1>
      <p className="page-sub" style={{ maxWidth: 560, fontSize: 15, lineHeight: 1.6 }}>
        Build a fantasy lineup and tune the rules to how your group actually plays. Here's how the
        pieces fit together.
      </p>

      <div className="game-card">
        <div className="matchup-teams" style={{ fontSize: 18 }}>1. Set your Rules</div>
        <p style={{ color: 'var(--chalk-dim)', fontSize: 14, marginTop: 8 }}>
          Decide how many QBs, RBs, WRs, TEs, FLEX, kickers, and defenses your lineup carries —
          the classic format is set by default (1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K, 1 DEF, 6 bench).
        </p>
      </div>

      <div className="game-card">
        <div className="matchup-teams" style={{ fontSize: 18 }}>2. Build your Lineup</div>
        <p style={{ color: 'var(--chalk-dim)', fontSize: 14, marginTop: 8 }}>
          New here? Head to Lineup and hit <strong>Get recommended lineup</strong> — it auto-fills
          every slot with the highest-projected player available for that position, so you're never
          starting from a blank roster.
        </p>
      </div>

      <div className="game-card">
        <div className="matchup-teams" style={{ fontSize: 18 }}>3. Fine-tune in the Selector</div>
        <p style={{ color: 'var(--chalk-dim)', fontSize: 14, marginTop: 8 }}>
          Browse the full player pool by position and swap anyone into an open slot on your roster,
          starters or bench.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Link to="/lineup" className="save-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Go to my Lineup
        </Link>
        <Link
          to="/rules"
          className="team-btn"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          Adjust Rules
        </Link>
      </div>
    </div>
  );
}