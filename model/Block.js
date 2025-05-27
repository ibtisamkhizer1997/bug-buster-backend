// const mongoose = require('mongoose');

// const blockSchema = new mongoose.Schema({
//   blockCode: {
//     type: String,
//     required: true,
//     unique: true,
//     trim: true,
//   },
//   blockName: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// blockSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// module.exports = mongoose.model('Block', blockSchema);

const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  blockCode: { type: String, required: true, unique: true },
  blockName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

module.exports = mongoose.model('Block', blockSchema);