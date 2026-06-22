const mongoose = require('mongoose');

const cartHoldSchema = new mongoose.Schema(
  {
    tokenId:       { type: String, required: true, unique: true },
    customerName:  { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerId:    { type: String },
    slotNumber:    { type: Number, required: true },
    depositAmount: { type: Number, default: 20 },
    status:        { type: String, enum: ['active', 'retrieved', 'expired'], default: 'active' },
    depositedAt:   { type: Date, default: Date.now },
    retrievedAt:   { type: Date },
    notes:         { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CartHold', cartHoldSchema);
