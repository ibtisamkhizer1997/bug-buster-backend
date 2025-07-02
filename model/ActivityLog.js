// const mongoose = require('mongoose');

// const activityLogSchema = new mongoose.Schema({
//   action: {
//     type: String,
//     required: true,
//     enum: [
//        'create',
//        'update', 
//        'reopen', 
//        'delete', 
//        'send-email', 
//        'comment', 
//        'view'
//       ],
//   },
//   entityType: {
//     type: String,
//     required: true,
//     default: 'Issue',
//   },
//   entityId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Issue',
//     required: true,
//   },
//   // entityDetails: {
//   //   userName: { type: String },
//   //   branch: {
//   //     _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
//   //     branchCode: { type: String },
//   //     branchName: { type: String },
//   //   },
//   //   department: {
//   //     _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
//   //     departmentCode: { type: String },
//   //     departmentName: { type: String },
//   //   },
//   //   assignedTo: {
//   //     _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   //     name: { type: String },
//   //     email: { type: String },
//   //   },
//   //   description: { type: String },
//   //   status: { type: String },
//   //   priority: { type: String },
//   //   attachment: { type: String },
//   //   rating: { type: Number },
//   //   feedback: { type: String },
//   //   comments: [{
//   //     text: { type: String },
//   //     commentedBy: {
//   //       _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//   //       name: { type: String },
//   //       email: { type: String },
//   //     },
//   //     commentedAt: { type: Date },
//   //   }],
//   // },
//   // performedBy: {
//   //   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   //   name: { type: String },
//   //   email: { type: String },
//   // },
//   performedAt: {
//     type: Date,
//     default: Date.now,
//   },
//   changes: {
//     type: Map,
//     of: mongoose.Schema.Types.Mixed,
//     default: {},
//   },
// }, { timestamps: true });

// module.exports = mongoose.model('ActivityLog', activityLogSchema);


const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'create',
      'update',
      'reopen',
      'delete',
      'send-email',
      'comment',
      'view',
      'restore'
    ],
  },
  entityType: {
    type: String,
    required: true,
    default: 'Issue',
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
  },
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  message: {
    type: String,
    required: true,
  },
  changes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  performedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);