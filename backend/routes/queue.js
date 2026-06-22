const express = require('express');
const router  = express.Router();
const Queue   = require('../models/Queue');
const Counter = require('../models/Counter');

// ── In-memory fallback ────────────────────────────────────────────────────────
let _mem = [
  { id: 'q1', tokenNumber: 42, customerName: 'Priya Sharma',  customerPhone: '9876543210', counterId: '1', counterNumber: 1, status: 'serving', position: 1, estimatedWait: 0,  joinedAt: new Date(Date.now() - 300000) },
  { id: 'q2', tokenNumber: 43, customerName: 'Rahul Mehta',   customerPhone: '9123456789', counterId: '1', counterNumber: 1, status: 'waiting', position: 2, estimatedWait: 8,  joinedAt: new Date(Date.now() - 200000) },
  { id: 'q3', tokenNumber: 44, customerName: 'Anita Reddy',   customerPhone: '8765432109', counterId: '1', counterNumber: 1, status: 'waiting', position: 3, estimatedWait: 16, joinedAt: new Date(Date.now() - 100000) },
  { id: 'q4', tokenNumber: 38, customerName: 'Suresh Kumar',  customerPhone: '7654321098', counterId: '2', counterNumber: 2, status: 'serving', position: 1, estimatedWait: 0,  joinedAt: new Date(Date.now() - 400000) },
  { id: 'q5', tokenNumber: 39, customerName: 'Meena Joshi',   customerPhone: '9001122334', counterId: '2', counterNumber: 2, status: 'waiting', position: 2, estimatedWait: 8,  joinedAt: new Date(Date.now() - 180000) },
];
let _tokenCounter = 100;

const useDB = () => require('mongoose').connection.readyState === 1;
const active = ['waiting', 'called', 'serving'];

// ── GET /api/queue  (admin – all active entries) ──────────────────────────────
router.get('/', async (req, res) => {
  try {
    const data = useDB()
      ? await Queue.find({ status: { $in: active } }).sort('counterId position')
      : _mem.filter(q => active.includes(q.status));
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/queue/counter/:counterId ─────────────────────────────────────────
router.get('/counter/:counterId', async (req, res) => {
  try {
    const data = useDB()
      ? await Queue.find({ counterId: req.params.counterId, status: { $in: active } }).sort('position')
      : _mem.filter(q => q.counterId === req.params.counterId && active.includes(q.status));
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/queue/token/:tokenId ─────────────────────────────────────────────
router.get('/token/:tokenId', async (req, res) => {
  try {
    const data = useDB()
      ? await Queue.findById(req.params.tokenId)
      : _mem.find(q => q.id === req.params.tokenId);
    if (!data) return res.status(404).json({ success: false, message: 'Token not found' });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/queue/join ──────────────────────────────────────────────────────
router.post('/join', async (req, res) => {
  try {
    const { customerName, customerPhone, counterId, counterNumber } = req.body;
    if (!customerName || !counterId) return res.status(400).json({ success: false, message: 'customerName and counterId are required' });

    let position;
    let entry;

    if (useDB()) {
      position = await Queue.countDocuments({ counterId, status: { $in: active } }) + 1;
      _tokenCounter++;
      entry = await Queue.create({
        tokenNumber: _tokenCounter, customerName, customerPhone,
        counterId, counterNumber, position, estimatedWait: (position - 1) * 8,
      });
      // Update counter queueCount
      await Counter.findByIdAndUpdate(counterId, { $inc: { queueCount: 1 } });
    } else {
      const cq = _mem.filter(q => q.counterId === counterId && active.includes(q.status));
      position = cq.length + 1;
      _tokenCounter++;
      entry = {
        id: `q${Date.now()}`, tokenNumber: _tokenCounter, customerName, customerPhone,
        counterId, counterNumber, status: 'waiting', position,
        estimatedWait: (position - 1) * 8, joinedAt: new Date(),
      };
      _mem.push(entry);
    }

    req.io.emit('queue-updated', { counterId, entry });
    res.status(201).json({ success: true, data: entry });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/queue/next/:counterId  (call next customer) ────────────────────
router.post('/next/:counterId', async (req, res) => {
  try {
    let next;
    if (useDB()) {
      next = await Queue.findOne({ counterId: req.params.counterId, status: 'waiting' }).sort('position');
      if (!next) return res.json({ success: false, message: 'No one waiting' });
      next.status  = 'called';
      next.calledAt = new Date();
      await next.save();
    } else {
      const waiting = _mem.filter(q => q.counterId === req.params.counterId && q.status === 'waiting').sort((a, b) => a.position - b.position);
      if (!waiting.length) return res.json({ success: false, message: 'No one waiting' });
      const idx = _mem.findIndex(q => q.id === waiting[0].id);
      _mem[idx].status   = 'called';
      _mem[idx].calledAt = new Date();
      next = _mem[idx];
    }

    req.io.emit('customer-called', { tokenId: next._id || next.id, tokenNumber: next.tokenNumber, counterNumber: next.counterNumber });
    res.json({ success: true, data: next });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PUT /api/queue/:id/status ─────────────────────────────────────────────────
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    let entry;

    if (useDB()) {
      entry = await Queue.findById(req.params.id);
      if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
      entry.status = status;
      if (status === 'called') entry.calledAt    = new Date();
      if (status === 'done')   entry.completedAt = new Date();
      await entry.save();
      if (status === 'done') await Counter.findByIdAndUpdate(entry.counterId, { $inc: { currentServing: 1, queueCount: -1 } });
    } else {
      const idx = _mem.findIndex(q => q.id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
      _mem[idx].status = status;
      if (status === 'called') _mem[idx].calledAt    = new Date();
      if (status === 'done')   _mem[idx].completedAt = new Date();
      entry = _mem[idx];
    }

    req.io.emit('queue-updated', { counterId: entry.counterId, entry });
    if (status === 'called') req.io.emit('customer-called', { tokenId: entry._id || entry.id, tokenNumber: entry.tokenNumber });
    res.json({ success: true, data: entry });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── DELETE /api/queue/:id  (cancel token) ────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (useDB()) {
      const entry = await Queue.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
      if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
      req.io.emit('queue-updated', { counterId: entry.counterId, entry });
    } else {
      const idx = _mem.findIndex(q => q.id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
      _mem[idx].status = 'cancelled';
      req.io.emit('queue-updated', { counterId: _mem[idx].counterId, entry: _mem[idx] });
    }
    res.json({ success: true, message: 'Token cancelled' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
