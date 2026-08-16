import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <h1 className="page-title">Welcome to your Fantasy football playbook</h1>
      <p className="page-sub">
        Build a fantasy lineup and tune the rules to how your group actually plays. Here's how the
        pieces fit together.
      </p>

      <div className="home-grid">
        <div className="box">
          <div className="week-eyebrow">Set your Rules</div>
          <p style={{ color: 'var(--ink-dim)', fontSize: 14, margin: 0 }}>
            Decide how many QBs, RBs, WRs, TEs, FLEX, kickers, and defenses your lineup carries.
          </p>
        </div>

        <div className="box hub">
          <div className="week-eyebrow">Build your Lineup</div>
          <p style={{ color: 'var(--ink-dim)', fontSize: 14, margin: 0 }}>
            New here? Head to Lineup and hit <strong>Get recommended lineup</strong> — it auto-fills
            every slot with the highest-projected player available, so you're never starting from a
            blank roster. Rules and Selector both feed into what shows up here.
          </p>
        </div>

        <div className="box">
          <div className="week-eyebrow">Fine-tune in the Selector</div>
          <p style={{ color: 'var(--ink-dim)', fontSize: 14, margin: 0 }}>
            Browse the player pool by position and swap anyone into an open slot on your roster.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Link to="/lineup" className="primary-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Go to my Lineup
        </Link>
        <Link
          to="/rules"
          className="option-btn"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          Adjust Rules
        </Link>
      </div>
    </div>
  );
}