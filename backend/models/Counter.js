const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    name:           { type: String, required: true },
    number:         { type: Number, required: true, unique: true },
    isActive:       { type: Boolean, default: true },
    currentServing: { type: Number, default: 0 },
    waitTime:       { type: Number, default: 0 },   // minutes
    queueCount:     { type: Number, default: 0 },
    type:           { type: String, enum: ['express', 'regular', 'priority'], default: 'regular' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Counter', counterSchema);
