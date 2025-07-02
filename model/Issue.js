const mongoose = require('mongoose');

// const commentSchema = new mongoose.Schema({
//   text: {
//     type: String,
//     required: true,
//     trim: true,
//     maxlength: 1000,
//   },
//   commentedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   commentedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

const issueSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    trim: true,
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    trim: true,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending',
  },
  priority: {
    type: String,
    required: true,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
    trim: true,
  },
  attachment: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: null,
  },
  feedback: {
    type: String,
    trim: true,
    default: '',
  },
  comments: { 
    type: String,
    default: '',
    maxlength: 5000, // Adjust as needed
  },
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Issue', issueSchema);