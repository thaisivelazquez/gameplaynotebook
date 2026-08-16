const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const FLEX_ELIGIBLE = ['RB', 'WR', 'TE'];

// Build the full ordered list of slot names for a given rules row,
// e.g. { qb_slots: 1, rb_slots: 2, ... } -> ['QB1', 'RB1', 'RB2', 'WR1', ...]
function buildSlotList(rules) {
  const slots = [];
  const push = (prefix, count) => {
    for (let i = 1; i <= count; i++) slots.push(count === 1 ? prefix : `${prefix}${i}`);
  };
  push('QB', rules.qb_slots);
  push('RB', rules.rb_slots);
  push('WR', rules.wr_slots);
  push('TE', rules.te_slots);
  push('FLEX', rules.flex_slots);
  push('K', rules.k_slots);
  push('DEF', rules.def_slots);
  push('BENCH', rules.bench_slots);
  return slots;
}

function slotBasePosition(slot) {
  return slot.replace(/\d+$/, ''); // 'RB2' -> 'RB', 'FLEX1' -> 'FLEX'
}

async function getOrCreateRules(userId) {
  const existing = await pool.query('SELECT * FROM rules WHERE user_id = $1', [userId]);
  if (existing.rows.length) return existing.rows[0];

  const created = await pool.query(
    `INSERT INTO rules (user_id) VALUES ($1) RETURNING *`,
    [userId]
  );
  return created.rows[0];
}

// GET /api/roster/me - current lineup, joined with player details, plus open slots
router.get('/me', requireAuth, async (req, res) => {
  try {
    const rules = await getOrCreateRules(req.user.id);
    const slotList = buildSlotList(rules);

    const result = await pool.query(
      `SELECT r.slot, p.*
       FROM roster r
       JOIN players p ON p.id = r.player_id
       WHERE r.user_id = $1`,
      [req.user.id]
    );

    const bySlot = Object.fromEntries(result.rows.map((row) => [row.slot, row]));
    const lineup = slotList.map((slot) => ({
      slot,
      position: slotBasePosition(slot),
      player: bySlot[slot] || null,
    }));

    res.json({ rules, lineup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// POST /api/roster - assign a player to a slot (upsert)
router.post('/', requireAuth, async (req, res) => {
  const { slot, player_id } = req.body;
  if (!slot || !player_id) {
    return res.status(400).json({ error: 'slot and player_id are required' });
  }

  try {
    const rules = await getOrCreateRules(req.user.id);
    const validSlots = buildSlotList(rules);
    if (!validSlots.includes(slot)) {
      return res.status(400).json({ error: `${slot} is not a valid slot under your current rules` });
    }

    const playerResult = await pool.query('SELECT * FROM players WHERE id = $1', [player_id]);
    const player = playerResult.rows[0];
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const base = slotBasePosition(slot);
    const eligible =
      base === 'FLEX' ? FLEX_ELIGIBLE.includes(player.position) :
      base === 'BENCH' ? true :
      player.position === base;

    if (!eligible) {
      return res.status(400).json({ error: `${player.name} (${player.position}) can't fill a ${base} slot` });
    }

    const result = await pool.query(
      `INSERT INTO roster (user_id, player_id, slot)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, slot)
       DO UPDATE SET player_id = EXCLUDED.player_id, created_at = NOW()
       RETURNING *`,
      [req.user.id, player_id, slot]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lineup' });
  }
});

// DELETE /api/roster/:slot - clear a slot
router.delete('/:slot', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM roster WHERE user_id = $1 AND slot = $2', [
      req.user.id,
      req.params.slot,
    ]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear slot' });
  }
});

// POST /api/roster/recommend - auto-fill the lineup with the best available
// projected players for each slot, respecting the user's current rules.
// This powers the "new user" suggested-lineup flow.
router.post('/recommend', requireAuth, async (req, res) => {
  try {
    const rules = await getOrCreateRules(req.user.id);
    const slotList = buildSlotList(rules);

    const playersResult = await pool.query('SELECT * FROM players ORDER BY projected_points DESC');
    const allPlayers = playersResult.rows;
    const used = new Set();

    function takeBest(positions) {
      const pick = allPlayers.find((p) => positions.includes(p.position) && !used.has(p.id));
      if (pick) used.add(pick.id);
      return pick || null;
    }

    const assignments = [];
    // Fill dedicated-position slots first, then FLEX, then BENCH with best remaining overall.
    for (const slot of slotList) {
      const base = slotBasePosition(slot);
      if (base === 'FLEX') continue;
      if (base === 'BENCH') continue;
      const pick = takeBest([base]);
      if (pick) assignments.push({ slot, player: pick });
    }
    for (const slot of slotList) {
      if (slotBasePosition(slot) !== 'FLEX') continue;
      const pick = takeBest(FLEX_ELIGIBLE);
      if (pick) assignments.push({ slot, player: pick });
    }
    for (const slot of slotList) {
      if (slotBasePosition(slot) !== 'BENCH') continue;
      const pick = takeBest(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);
      if (pick) assignments.push({ slot, player: pick });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM roster WHERE user_id = $1', [req.user.id]);
      for (const { slot, player } of assignments) {
        await client.query(
          `INSERT INTO roster (user_id, player_id, slot) VALUES ($1, $2, $3)`,
          [req.user.id, player.id, slot]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ assigned: assignments.length, total_slots: slotList.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate a recommended lineup' });
  }
});

module.exports = router;
