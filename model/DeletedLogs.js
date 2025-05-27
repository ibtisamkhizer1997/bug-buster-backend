const mongoose = require('mongoose');

const deletedLogSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    trim: true,
  },
  entityDetails: {
    type: mongoose.Schema.Types.Mixed, // Store arbitrary JSON (e.g., branch data)
    required: true,
  },
  deletedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    trim: true,
    default: '',
  },
});

module.exports = mongoose.model('DeletedLog', deletedLogSchema);