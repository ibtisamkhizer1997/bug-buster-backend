const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  branchName: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

branchSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Branch', branchSchema);