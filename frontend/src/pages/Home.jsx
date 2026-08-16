import React from 'react';
import { Link } from 'react-router-dom';

function RouteTreeDiagram() {
  return (
    <svg width="170" height="150" viewBox="0 0 170 150" className="home-doodle" aria-hidden="true">
      <circle cx="30" cy="120" r="9" fill="#ffffff" stroke="var(--ink)" strokeWidth="1.5" />
      <path
        d="M38 113 L95 35"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        markerEnd="url(#homeArrow)"
      />
      <path
        d="M39 116 L145 55"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        markerEnd="url(#homeArrow)"
      />
      <path
        d="M40 122 L150 118"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        markerEnd="url(#homeArrow)"
      />
      <g stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="124" y1="15" x2="136" y2="27" />
        <line x1="136" y1="15" x2="124" y2="27" />
        <line x1="150" y1="82" x2="162" y2="94" />
        <line x1="162" y1="82" x2="150" y2="94" />
      </g>
      <defs>
        <marker id="homeArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
    </svg>
  );
}

function FormationDiagram() {
  return (
    <svg width="170" height="150" viewBox="0 0 170 150" className="home-doodle" aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth="1.5">
        <line x1="110" y1="35" x2="62" y2="108" />
        <line x1="110" y1="35" x2="152" y2="108" />
        <line x1="62" y1="108" x2="152" y2="108" />
      </g>
      <circle cx="110" cy="35" r="9" fill="#ffffff" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="62" cy="108" r="9" fill="#ffffff" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="152" cy="108" r="9" fill="#ffffff" stroke="var(--ink)" strokeWidth="1.5" />
      <path
        d="M117 26 L140 8"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        markerEnd="url(#homeArrow2)"
      />
      <g stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="85" y1="70" x2="85" y2="80" />
        <line x1="80" y1="75" x2="90" y2="75" />
        <line x1="130" y1="70" x2="130" y2="80" />
        <line x1="125" y1="75" x2="135" y2="75" />
      </g>
      <defs>
        <marker id="homeArrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
    </svg>
  );
}

export default function Home() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 className="page-title">Welcome to your Fantasy football playbook</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Build a fantasy lineup and tune the rules to how your group actually plays. Here's how
            the pieces fit together.
          </p>
        </div>
        <RouteTreeDiagram />
      </div>

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
            New here? Head to Lineup and hit <strong>Get recommended lineup</strong> - it auto-fills
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
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
        <FormationDiagram />
      </div>
    </div>
  );
}