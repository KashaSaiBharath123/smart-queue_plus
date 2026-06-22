const express  = require('express');
const router   = express.Router();
const CartHold = require('../models/CartHold');

// ── In-memory fallback ────────────────────────────────────────────────────────
let _mem = [
  { id: 'ch1', tokenId: 'CHD-20240001', customerName: 'Deepa Nair',  customerPhone: '9988776655', slotNumber: 3,  depositAmount: 20, status: 'active', depositedAt: new Date(Date.now() - 1800000) },
  { id: 'ch2', tokenId: 'CHD-20240002', customerName: 'Vijay Patel', customerPhone: '8877665544', slotNumber: 7,  depositAmount: 20, status: 'active', depositedAt: new Date(Date.now() - 900000) },
];
let _holdCounter = 2;
const TOTAL_SLOTS = 20;

const useDB = () => require('mongoose').connection.readyState === 1;

// ── GET /api/cart-hold  (all records) ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const data = useDB() ? await CartHold.find().sort('-depositedAt') : _mem;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/cart-hold/active ─────────────────────────────────────────────────
router.get('/active', async (req, res) => {
  try {
    const data = useDB()
      ? await CartHold.find({ status: 'active' }).sort('slotNumber')
      : _mem.filter(c => c.status === 'active');
    res.json({ success: true, data, count: data.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/cart-hold/slots ──────────────────────────────────────────────────
router.get('/slots', async (req, res) => {
  try {
    const active = useDB()
      ? await CartHold.find({ status: 'active' }, 'slotNumber')
      : _mem.filter(c => c.status === 'active');
    const usedSlots = active.map(c => c.slotNumber);
    const availableSlots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i + 1).filter(s => !usedSlots.includes(s));
    res.json({ success: true, data: { totalSlots: TOTAL_SLOTS, usedSlots, availableSlots } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/cart-hold/token/:tokenId ────────────────────────────────────────
router.get('/token/:tokenId', async (req, res) => {
  try {
    const data = useDB()
      ? await CartHold.findOne({ tokenId: req.params.tokenId })
      : _mem.find(c => c.tokenId === req.params.tokenId);
    if (!data) return res.status(404).json({ success: false, message: 'Token not found' });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/cart-hold/deposit ───────────────────────────────────────────────
router.post('/deposit', async (req, res) => {
  try {
    const { customerName, customerPhone, customerId, notes } = req.body;
    if (!customerName || !customerPhone) return res.status(400).json({ success: false, message: 'customerName and customerPhone are required' });

    // Find next free slot
    const active = useDB()
      ? await CartHold.find({ status: 'active' }, 'slotNumber')
      : _mem.filter(c => c.status === 'active');
    const used = active.map(c => c.slotNumber);
    let slot = 1;
    while (used.includes(slot) && slot <= TOTAL_SLOTS) slot++;
    if (slot > TOTAL_SLOTS) return res.status(400).json({ success: false, message: 'All cart hold slots are currently full. Please try again shortly.' });

    _holdCounter++;
    const year    = new Date().getFullYear();
    const tokenId = `CHD-${year}${String(_holdCounter).padStart(4, '0')}`;

    let hold;
    if (useDB()) {
      hold = await CartHold.create({ tokenId, customerName, customerPhone, customerId, slotNumber: slot, notes });
    } else {
      hold = { id: `ch${Date.now()}`, tokenId, customerName, customerPhone, customerId, slotNumber: slot, depositAmount: 20, status: 'active', depositedAt: new Date(), notes };
      _mem.push(hold);
    }

    req.io.emit('cart-hold-updated', { action: 'deposit', hold });
    res.status(201).json({ success: true, data: hold, message: `Cart secured at Slot ${slot}. Token: ${tokenId}. ₹20 refundable on retrieval.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PUT /api/cart-hold/retrieve/:tokenId ─────────────────────────────────────
router.put('/retrieve/:tokenId', async (req, res) => {
  try {
    let hold;
    if (useDB()) {
      hold = await CartHold.findOne({ tokenId: req.params.tokenId });
      if (!hold)                      return res.status(404).json({ success: false, message: 'Token not found' });
      if (hold.status !== 'active')   return res.status(400).json({ success: false, message: 'Cart already retrieved or expired' });
      hold.status      = 'retrieved';
      hold.retrievedAt = new Date();
      await hold.save();
    } else {
      const idx = _mem.findIndex(c => c.tokenId === req.params.tokenId);
      if (idx === -1)                        return res.status(404).json({ success: false, message: 'Token not found' });
      if (_mem[idx].status !== 'active')     return res.status(400).json({ success: false, message: 'Cart already retrieved or expired' });
      _mem[idx].status      = 'retrieved';
      _mem[idx].retrievedAt = new Date();
      hold = _mem[idx];
    }

    req.io.emit('cart-hold-updated', { action: 'retrieve', hold });
    res.json({ success: true, data: hold, message: `✅ Cart from Slot ${hold.slotNumber} retrieved. ₹20 refunded to ${hold.customerName}.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PUT /api/cart-hold/expire/:tokenId ───────────────────────────────────────
router.put('/expire/:tokenId', async (req, res) => {
  try {
    let hold;
    if (useDB()) {
      hold = await CartHold.findOneAndUpdate({ tokenId: req.params.tokenId, status: 'active' }, { status: 'expired' }, { new: true });
      if (!hold) return res.status(404).json({ success: false, message: 'Active token not found' });
    } else {
      const idx = _mem.findIndex(c => c.tokenId === req.params.tokenId && c.status === 'active');
      if (idx === -1) return res.status(404).json({ success: false, message: 'Active token not found' });
      _mem[idx].status = 'expired';
      hold = _mem[idx];
    }
    req.io.emit('cart-hold-updated', { action: 'expire', hold });
    res.json({ success: true, data: hold });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
