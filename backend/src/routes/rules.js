const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const DEFAULTS = {
  qb_slots: 1,
  rb_slots: 2,
  wr_slots: 2,
  te_slots: 1,
  flex_slots: 1,
  k_slots: 1,
  def_slots: 1,
  bench_slots: 6,
};

// GET /api/rules/me - fetch this user's rules, creating the classic default row if missing
router.get('/me', requireAuth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM rules WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) return res.json(existing.rows[0]);

    const created = await pool.query(
      `INSERT INTO rules (user_id, qb_slots, rb_slots, wr_slots, te_slots, flex_slots, k_slots, def_slots, bench_slots)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        DEFAULTS.qb_slots,
        DEFAULTS.rb_slots,
        DEFAULTS.wr_slots,
        DEFAULTS.te_slots,
        DEFAULTS.flex_slots,
        DEFAULTS.k_slots,
        DEFAULTS.def_slots,
        DEFAULTS.bench_slots,
      ]
    );
    res.json(created.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// PUT /api/rules/me - update slot counts for this user's league format
router.put('/me', requireAuth, async (req, res) => {
  const fields = ['qb_slots', 'rb_slots', 'wr_slots', 'te_slots', 'flex_slots', 'k_slots', 'def_slots', 'bench_slots'];
  const values = {};

  for (const field of fields) {
    const raw = req.body[field];
    if (raw === undefined) continue;
    const num = Number(raw);
    if (!Number.isInteger(num) || num < 0 || num > 10) {
      return res.status(400).json({ error: `${field} must be an integer between 0 and 10` });
    }
    values[field] = num;
  }

  try {
    const existing = await pool.query('SELECT * FROM rules WHERE user_id = $1', [req.user.id]);
    const merged = { ...DEFAULTS, ...existing.rows[0], ...values };

    const result = await pool.query(
      `INSERT INTO rules (user_id, qb_slots, rb_slots, wr_slots, te_slots, flex_slots, k_slots, def_slots, bench_slots)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         qb_slots = EXCLUDED.qb_slots,
         rb_slots = EXCLUDED.rb_slots,
         wr_slots = EXCLUDED.wr_slots,
         te_slots = EXCLUDED.te_slots,
         flex_slots = EXCLUDED.flex_slots,
         k_slots = EXCLUDED.k_slots,
         def_slots = EXCLUDED.def_slots,
         bench_slots = EXCLUDED.bench_slots,
         updated_at = NOW()
       RETURNING *`,
      [
        req.user.id,
        merged.qb_slots,
        merged.rb_slots,
        merged.wr_slots,
        merged.te_slots,
        merged.flex_slots,
        merged.k_slots,
        merged.def_slots,
        merged.bench_slots,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update rules' });
  }
});

module.exports = router;
