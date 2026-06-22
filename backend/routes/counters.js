const express = require('express');
const router  = express.Router();
const Counter = require('../models/Counter');

// ── Seed in-memory fallback (used if MongoDB is unavailable) ──────────────────
let _mem = [
  { id: '1', name: 'Counter 1',          number: 1, isActive: true,  currentServing: 42, waitTime: 8,  queueCount: 4, type: 'regular'  },
  { id: '2', name: 'Counter 2',          number: 2, isActive: true,  currentServing: 38, waitTime: 15, queueCount: 7, type: 'regular'  },
  { id: '3', name: 'Express (≤5 items)', number: 3, isActive: true,  currentServing: 55, waitTime: 5,  queueCount: 2, type: 'express'  },
  { id: '4', name: 'Priority / Senior',  number: 4, isActive: true,  currentServing: 20, waitTime: 3,  queueCount: 1, type: 'priority' },
  { id: '5', name: 'Counter 5',          number: 5, isActive: false, currentServing: 0,  waitTime: 0,  queueCount: 0, type: 'regular'  },
  { id: '6', name: 'Counter 6',          number: 6, isActive: true,  currentServing: 61, waitTime: 20, queueCount: 9, type: 'regular'  },
];

const useDB = () => require('mongoose').connection.readyState === 1;

// GET /api/counters
router.get('/', async (req, res) => {
  try {
    const data = useDB() ? await Counter.find().sort('number') : _mem;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/counters/:id
router.get('/:id', async (req, res) => {
  try {
    const data = useDB()
      ? await Counter.findById(req.params.id)
      : _mem.find(c => c.id === req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Counter not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/counters
router.post('/', async (req, res) => {
  try {
    const { name, number, type } = req.body;
    let data;
    if (useDB()) {
      data = await Counter.create({ name, number, type: type || 'regular' });
    } else {
      data = { id: Date.now().toString(), name, number, type: type || 'regular', isActive: true, currentServing: 0, waitTime: 0, queueCount: 0 };
      _mem.push(data);
    }
    req.io.emit('counters-updated', useDB() ? await Counter.find().sort('number') : _mem);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/counters/:id
router.put('/:id', async (req, res) => {
  try {
    let data;
    if (useDB()) {
      data = await Counter.findByIdAndUpdate(req.params.id, req.body, { new: true });
    } else {
      const idx = _mem.findIndex(c => c.id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
      _mem[idx] = { ..._mem[idx], ...req.body };
      data = _mem[idx];
    }
    req.io.emit('counters-updated', useDB() ? await Counter.find().sort('number') : _mem);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/counters/:id
router.delete('/:id', async (req, res) => {
  try {
    if (useDB()) {
      await Counter.findByIdAndDelete(req.params.id);
    } else {
      _mem = _mem.filter(c => c.id !== req.params.id);
    }
    req.io.emit('counters-updated', useDB() ? await Counter.find().sort('number') : _mem);
    res.json({ success: true, message: 'Counter deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
