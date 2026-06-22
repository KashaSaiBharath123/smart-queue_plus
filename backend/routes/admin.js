const express  = require('express');
const router   = express.Router();
const Queue    = require('../models/Queue');
const Counter  = require('../models/Counter');
const CartHold = require('../models/CartHold');

const useDB = () => require('mongoose').connection.readyState === 1;

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    let stats;

    if (useDB()) {
      const [totalWaiting, totalServing, totalDone, activeHolds, activeCounters, allCounters] = await Promise.all([
        Queue.countDocuments({ status: 'waiting' }),
        Queue.countDocuments({ status: { $in: ['serving', 'called'] } }),
        Queue.countDocuments({ status: 'done' }),
        CartHold.countDocuments({ status: 'active' }),
        Counter.countDocuments({ isActive: true }),
        Counter.find({ isActive: true }, 'waitTime'),
      ]);

      const avgWaitTime = allCounters.length
        ? Math.round(allCounters.reduce((s, c) => s + c.waitTime, 0) / allCounters.length)
        : 0;

      stats = { totalWaiting, totalServing, totalDone, activeHolds, activeCounters, avgWaitTime };
    } else {
      // Static demo data
      stats = {
        totalWaiting: 14, totalServing: 5, totalDone: 347,
        activeHolds: 2, activeCounters: 5, avgWaitTime: 10,
      };
    }

    // Hourly data is always static/demo for now
    stats.hourlyData = [
      { hour: '8 AM',  customers: 23 },
      { hour: '9 AM',  customers: 45 },
      { hour: '10 AM', customers: 67 },
      { hour: '11 AM', customers: 89 },
      { hour: '12 PM', customers: 72 },
      { hour: '1 PM',  customers: 54 },
      { hour: '2 PM',  customers: 38 },
      { hour: '3 PM',  customers: 43 },
      { hour: '4 PM',  customers: 62 },
      { hour: '5 PM',  customers: 78 },
      { hour: '6 PM',  customers: 53 },
      { hour: '7 PM',  customers: 39 },
    ];
    stats.peakHour         = '11:00 AM – 12:00 PM';
    stats.satisfactionScore = 4.2;

    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/history  (last 50 served) ─────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    if (!useDB()) return res.json({ success: true, data: [] });
    const data = await Queue.find({ status: 'done' }).sort('-completedAt').limit(50);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
