const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: String, enum: ['EndUser', 'ServiceProvider', 'Admin', 'SuperAdmin'] }],
  phone: { type: String },
  houseNo: { type: String },
  block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false } // Changed to optional
});

module.exports = mongoose.model('User', userSchema);