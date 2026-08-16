import React from 'react';

const INJURY_LABELS = {
  questionable: 'Q',
  doubtful: 'D',
  out: 'OUT',
};

export default function InjuryBadge({ status, note }) {
  if (!status || !INJURY_LABELS[status]) return null;
  return (
    <span className={`injury-badge ${status}`} title={note || undefined}>
      {INJURY_LABELS[status]}
      {note ? ` · ${note}` : ''}
    </span>
  );
}