const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    tokenNumber:   { type: Number, required: true },
    customerName:  { type: String, required: true },
    customerPhone: { type: String },
    counterId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Counter', required: true },
    counterNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ['waiting', 'called', 'serving', 'done', 'cancelled'],
      default: 'waiting',
    },
    position:      { type: Number, required: true },
    estimatedWait: { type: Number, default: 0 },   // minutes
    joinedAt:      { type: Date, default: Date.now },
    calledAt:      { type: Date },
    completedAt:   { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Queue', queueSchema);
