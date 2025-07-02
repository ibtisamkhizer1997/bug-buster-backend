const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // company: { type: String, required: true },
  roles: [{ type: String, enum: ['EndUser', 'ServiceProvider', 'Admin', 'SuperAdmin'] }],
  phone: { type: String },
  // houseNo: { type: String },
  // block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Changed to optional
  rating: { type: Number, min: 0, max: 5, default: null,},
  feedback: { type: String, trim: true, default: '', },
});

module.exports = mongoose.model('User', userSchema);