// const express = require('express');
// const router = express.Router();
// const Issue = require('../model/Issue');
// const Branch = require('../model/Branch');
// const Department = require('../model/Department');
// const User = require('../model/User');
// const DeletedLog = require('../model/DeletedLogs');
// const ActivityLog = require('../model/ActivityLog');
// const jwt = require('jsonwebtoken');
// const multer = require('multer');
// const path = require('path');
// const nodemailer = require('nodemailer');
// const { default: mongoose } = require('mongoose');
// const Feedback = require('../model/Feedback');
// const { log } = require('console');
// require('dotenv').config();
// const cloudinary = require('cloudinary').v2;

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Configure Nodemailer
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Configure multer for memory storage
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//   fileFilter: (req, file, cb) => {
//     const filetypes = /jpeg|jpg|png|pdf/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
//     if (extname && mimetype) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only images (jpeg, jpg, png) and PDFs are allowed'));
//     }
//   },
// });

// // Middleware to verify JWT
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'Access token required' });
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (err) {
//     console.error('Token verification error:', err);
//     return res.status(403).json({ message: 'Invalid or expired token' });
//   }
// };

// // Helper function to create activity log
// const createActivityLog = async (action, issue, user, changes = {}) => {
//   try {
//     const activityLog = new ActivityLog({
//       action,
//       entityId: user.userId,
//       changes,
//     });
//     await activityLog.save();
//     console.log(`Activity log created for ${action} on issue ${issue._id}`);
//   } catch (error) {
//     console.error('Error creating activity log:', error);
//   }
// };

// // Get dropdown data
// router.get('/dropdowns', authenticateToken, async (req, res) => {
//   try {
//     const branches = await Branch.find().select('branchCode branchName');
//     const departments = await Department.find().select('departmentCode departmentName');
//     const users = await User.find({
//       _id: { $ne: req.user.userId },
//       roles: { $in: ['ServiceProvider'] },
//       $nor: [{ roles: { $size: 1, $eq: ['EndUser'] } }],
//     }).select('name email branch department _id roles');

//     res.json({ branches, departments, users });
//   } catch (error) {
//     console.error('Get dropdowns error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // Get single issue by ID
// router.get('/:id', authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.isValidObjectId(id)) {
//       return res.status(400).json({ message: 'Invalid issue ID' });
//     }

//     const issue = await Issue.findById(id)
//       .populate('branch', 'branchCode branchName')
//       .populate('department', 'departmentCode departmentName')
//       .populate('assignedTo', 'name email _id')
//       .populate('createdBy', 'name email _id')
//       // .populate('comments.commentedBy', 'name email _id');

//     if (!issue) {
//       return res.status(404).json({ message: 'Issue not found' });
//     }

//     res.json(issue);

//     await createActivityLog("view", issue, req.user)

//   } catch (error) {
//     console.error('Get issue error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // Get issues
// router.get('/', authenticateToken, async (req, res) => {
//   try {
//     const { assignedTo, createdBy } = req.query;
//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const validUsers = await User.find().select('_id');
//     const validUserIds = validUsers.map(user => user._id.toString());
//     console.log('Valid user IDs:', validUserIds);

//     const query = {};

//     if (assignedTo && createdBy) {
//       if (!validUserIds.includes(assignedTo) || !validUserIds.includes(createdBy)) {
//         console.log('Invalid user ID in query:', { assignedTo, createdBy });
//         return res.json([]);
//       }
//       query.$or = [
//         { assignedTo: assignedTo },
//         { createdBy: createdBy },
//       ];
//     } else {
//       if (assignedTo) {
//         if (!validUserIds.includes(assignedTo)) {
//           console.log('Invalid assignedTo ID:', assignedTo);
//           return res.json([]);
//         }
//         query.assignedTo = assignedTo;
//       }
//       if (createdBy) {
//         if (!validUserIds.includes(createdBy)) {
//           console.log('Invalid createdBy ID:', createdBy);
//           return res.json([]);
//         }
//         query.createdBy = createdBy;
//       }
//     }

//     query.$and = [
//       { $or: [{ assignedTo: { $in: validUserIds } }, { assignedTo: null }] },
//       { createdBy: { $in: validUserIds } },
//     ];

//     console.log('Constructed query:', JSON.stringify(query, null, 2));

//     let sortCriteria = { createdAt: -1 };
//     if (createdBy && assignedTo) {
//       sortCriteria = { createdAt: -1 };
//     } else if (createdBy) {
//       sortCriteria = { createdBy: 1, createdAt: -1 };
//     } else if (assignedTo) {
//       sortCriteria = { assignedTo: 1, createdAt: -1 };
//     }
//     console.log('Sort criteria:', sortCriteria);

//     const issues = await Issue.find(query)
//       .populate('branch', 'branchCode branchName')
//       .populate('department', 'departmentCode departmentName')
//       .populate('assignedTo', 'name email _id')
//       .populate('createdBy', 'name email _id')
//       // .populate('comments.commentedBy', 'name email _id')
//       .sort(sortCriteria);

//     console.log(`Found ${issues.length} issues`);

//     res.json(issues);
//   } catch (error) {
//     console.error('Get issues error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // Create a new issue
// router.post('/', authenticateToken, upload.single('attachment'), async (req, res) => {
//   try {
//     const { userName, branch, department, assignedTo, description, status, priority } = req.body;

//     console.log('POST /api/issues payload:', req.body);
//     console.log('File:', req.file);

//     if (!userName || !branch || !department || !assignedTo || !description || !status || !priority) {
//       return res.status(400).json({ message: 'All required fields must be provided' });
//     }

//     if (!['High', 'Medium', 'Low'].includes(priority)) {
//       return res.status(400).json({ message: 'Invalid priority value' });
//     }

//     if (!['pending', 'in-progress', 'resolved'].includes(status)) {
//       return res.status(400).json({ message: 'Invalid status value' });
//     }

//     const userExists = await User.findById(assignedTo);
//     if (!userExists) {
//       return res.status(400).json({ message: 'Invalid assignedTo user ID' });
//     }

//     const branchExists = await Branch.findById(branch);
//     if (!branchExists) {
//       return res.status(400).json({ message: 'Invalid branch ID' });
//     }

//     const departmentExists = await Department.findById(department);
//     if (!departmentExists) {
//       return res.status(400).json({ message: 'Invalid department ID' });
//     }

//     const creator = await User.findById(req.user.userId);
//     if (!creator) {
//       return res.status(404).json({ message: 'Creator user not found' });
//     }

//     let attachmentUrl = null;
//     if (req.file) {
//       console.log('Uploading to Cloudinary...');
//       const result = await new Promise((resolve, reject) => {
//         cloudinary.uploader.upload_stream(
//           {
//             folder: 'bugbuster_issues',
//           },
//           (error, result) => {
//             if (error) {
//               console.error('Cloudinary upload error:', error);
//               return reject(error);
//             }
//             resolve(result);
//           }
//         ).end(req.file.buffer);
//       });
//       attachmentUrl = result.secure_url;
//       console.log('Cloudinary URL:', attachmentUrl);
//     }

//     const issue = new Issue({
//       userName,
//       branch,
//       department,
//       assignedTo,
//       description,
//       status,
//       priority,
//       attachment: attachmentUrl,
//       createdBy: req.user.userId,
//       comments: "", 
//     });

//     const savedIssue = await issue.save();
//     console.log('Saved issue:', savedIssue);

//     const populatedIssue = await Issue.findById(savedIssue._id)
//       .populate('branch', 'branchCode branchName')
//       .populate('department', 'departmentCode departmentName')
//       .populate('assignedTo', 'name email _id')
//       .populate('createdBy', 'name email _id')

//     // Log activity
//     await createActivityLog('create', populatedIssue, creator);

//     // Send email notification to assignee
//     const mailOptions = {
//       from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
//       to: userExists.email,
//       subject: `New Task Assigned: ${savedIssue._id}`,
//       html: `
//         <h2>New Task Notification</h2>
//         <p>Dear ${userExists.name || 'User'},</p>
//         <p>A new task with ID <strong>${savedIssue._id}</strong> has been assigned to you by <strong>${creator.name || 'Unknown'}</strong>.</p>
//         <p><strong>Task Description:</strong> ${description}</p>
//         <p><strong>Priority:</strong> ${priority}</p>
//         <p>Please review the task and take appropriate action.</p>
//         <p>Best regards,<br/>BUGBUSTER Team</p>
//       `,
//     };

//     try {
//       await transporter.sendMail(mailOptions);
//       console.log('Email sent to assignee:', userExists.email);
//     } catch (emailError) {
//       console.error('Nodemailer error:', emailError);
//     }

//     res.status(201).json({ message: 'Issue created successfully', issue: populatedIssue });
//   } catch (error) {
//     console.error('Error creating issue:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // Add a comment to an issue
// // router.post('/:id/comments', authenticateToken, async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { text } = req.body;

// //     if (!mongoose.isValidObjectId(id)) {
// //       return res.status(400).json({ message: 'Invalid issue ID' });
// //     }

// //     if (!text || typeof text !== 'string' || text.trim().length === 0) {
// //       return res.status(400).json({ message: 'Comment text is required and must be a non-empty string' });
// //     }

// //     if (text.length > 1000) {
// //       return res.status(400).json({ message: 'Comment cannot exceed 1000 characters' });
// //     }

// //     const issue = await Issue.findById(id)
// //       .populate('assignedTo', 'name email _id')
// //       .populate('createdBy', 'name email _id');
// //     if (!issue) {
// //       return res.status(404).json({ message: 'Issue not found' });
// //     }

// //     const user = await User.findById(req.user.userId);
// //     if (!user) {
// //       return res.status(404).json({ message: 'User not found' });
// //     }

// //     const isSuperAdmin = user.roles.includes('SuperAdmin');
// //     const isAdmin = user.roles.includes('Admin');
// //     const isAssignee = issue.assignedTo && issue.assignedTo._id.toString() === req.user.userId;
// //     const isCreator = issue.createdBy && issue.createdBy._id.toString() === req.user.userId;

// //     if (!(isAssignee || isCreator || isAdmin || isSuperAdmin)) {
// //       return res.status(403).json({ message: 'Only the assignee, creator, Admin, or SuperAdmin can add comments' });
// //     }

// //     const newComment = {
// //       text: text.trim(),
// //       commentedBy: req.user.userId,
// //       commentedAt: new Date(),
// //     };

// //     issue.comments.push(newComment);
// //     await issue.save();

// //     const populatedIssue = await Issue.findById(id)
// //       .populate('branch', 'branchCode branchName')
// //       .populate('department', 'departmentCode departmentName')
// //       .populate('assignedTo', 'name email _id')
// //       .populate('createdBy', 'name email _id')
// //       .populate('comments.commentedBy', 'name email _id');

// //     // Log activity
// //     await createActivityLog('comment', populatedIssue, user, { commentText: text });

// //     // Send email notification to creator and assignee (if different from commenter)
// //     const recipients = [];
// //     if (issue.createdBy._id.toString() !== req.user.userId) {
// //       recipients.push(issue.createdBy.email);
// //     }
// //     if (issue.assignedTo._id.toString() !== req.user.userId) {
// //       recipients.push(issue.assignedTo.email);
// //     }

// //     if (recipients.length > 0) {
// //       const mailOptions = {
// //         from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
// //         to: recipients.join(','),
// //         subject: `New Comment on Task: ${id}`,
// //         html: `
// //           <h2>New Comment Notification</h2>
// //           <p>Dear ${recipients.length > 1 ? 'Team' : issue.assignedTo.name || 'User'},</p>
// //           <p>A new comment has been added to the task with ID <strong>${id}</strong> by <strong>${user.name || 'Unknown'}</strong>.</p>
// //           <p><strong>Comment:</strong> ${text}</p>
// //           <p><strong>Task Description:</strong> ${issue.description}</p>
// //           <p>Please review the task and comment as needed.</p>
// //           <p>Best regards,<br/>BUGBUSTER Team</p>
// //         `,
// //       };

// //       try {
// //         await transporter.sendMail(mailOptions);
// //         console.log('Comment notification email sent to:', recipients);
// //       } catch (emailError) {
// //         console.error('Nodemailer error:', emailError);
// //       }
// //     }

// //     res.status(201).json({ message: 'Comment added successfully', issue: populatedIssue });
// //   } catch (error) {
// //     console.error('Error adding comment:', error);
// //     res.status(500).json({ message: 'Server error', error: error.message });
// //   }
// // });

// // Update an issue
// router.put('/:id', authenticateToken, upload.single('attachment'), async (req, res) => {
//   try {
//     const issueId = req.params.id;
//     console.log('PUT /api/issues/:id - Request received for issue ID:', issueId);
//     console.log('Request body:', req.body);
//     console.log('Authenticated user ID:', req.user.userId);

//     const { userName, branch, department, assignedTo, description, status, priority, rating, feedback, comments } = req.body;


//     const normalizedStatus = status ? status.toLowerCase() : status;
//     console.log('Parsed payload:', {
//       userName,
//       branch,
//       department,
//       assignedTo,
//       description,
//       status: normalizedStatus,
//       priority,
//       rating,
//       feedback,
//       comments,
//     });


//     if (priority && !['High', 'Medium', 'Low'].includes(priority)) {
//       console.log('Validation failed: Invalid priority value:', priority);
//       return res.status(400).json({ message: 'Invalid priority value' });
//     }

//     if (normalizedStatus && !['pending', 'in-progress', 'resolved'].includes(normalizedStatus)) {
//       console.log('Validation failed: Invalid status value:', normalizedStatus);
//       return res.status(400).json({ message: 'Invalid status value' });
//     }

//     if (rating !== undefined) {
//       const ratingNum = Number(rating);
//       if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
//         console.log('Validation failed: Invalid rating value:', rating);
//         return res.status(400).json({ message: 'Rating must be a number between 0 and 5' });
//       }
//       console.log('Rating validated:', ratingNum);
//     }

//     if (feedback !== undefined) {
//       if (typeof feedback !== 'string') {
//         console.log('Validation failed: Feedback is not a string:', feedback);
//         return res.status(400).json({ message: 'Feedback must be a string' });
//       }
//       if (feedback.length > 500) {
//         console.log('Validation failed: Feedback exceeds 500 characters:', feedback.length);
//         return res.status(400).json({ message: 'Feedback cannot exceed 500 characters' });
//       }
//       console.log('Feedback validated:', feedback);
//     }

//     console.log('Fetching issue with ID:', issueId);
//     const issue = await Issue.findById(issueId)
//       .populate('assignedTo', '_id name email')
//       .populate('createdBy', '_id name email')
//       // .populate('comments.commentedBy', 'name email _id');
//     if (!issue) {
//       console.log('Issue not found for ID:', issueId);
//       return res.status(404).json({ message: 'Issue not found' });
//     }
//     console.log('Found issue:', {
//       _id: issue._id,
//       createdBy: issue.createdBy?._id,
//       assignedTo: issue.assignedTo?._id,
//       status: issue.status,
//       rating: issue.rating,
//       feedback: issue.feedback,
//     });

//     console.log('Fetching user with ID:', req.user.userId);
//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       console.log('User not found for ID:', req.user.userId);
//       return res.status(404).json({ message: 'User not found' });
//     }
//     console.log('Found user:', {
//       _id: user._id,
//       name: user.name,
//       roles: user.roles,
//     });

//     const isSuperAdmin = user.roles.includes('SuperAdmin');
//     const isAdmin = user.roles.includes('Admin');
//     const isAssignee = issue.assignedTo && issue.assignedTo._id.toString() === req.user.userId;
//     const isCreator = issue.createdBy && issue.createdBy._id.toString() === req.user.userId;

//     console.log('Permission check:', {
//       isSuperAdmin,
//       isAdmin,
//       isAssignee,
//       isCreator,
//     });


//     if ((rating !== undefined || feedback !== undefined) && !(isCreator || isAdmin || isSuperAdmin)) {
//       console.log('Permission denied: User cannot update rating or feedback');
//       return res.status(403).json({ message: 'Only the task creator, Admin, or SuperAdmin can provide rating or feedback' });
//     }

//     if (normalizedStatus && !(isCreator || isAssignee || isAdmin || isSuperAdmin)) {
//       console.log('Permission denied: User cannot update status');
//       return res.status(403).json({ message: 'Only the creator, assignee, Admin, or SuperAdmin can update status' });
//     }

//     const updateData = {};
//     if (userName && (isCreator || isAdmin || isSuperAdmin)) updateData.userName = userName;
//     if (comments && (isAssignee || isAdmin || isSuperAdmin)) {
//       if (!comments) {
//         console.log('Validation failed: Comments must be non empty');
//         return res.status(400).json({ message: 'Comments must be non empty' });
//       }
//       updateData.comments = comments;
//     }
//     if (branch && (isCreator || isAdmin || isSuperAdmin)) {
//       const branchExists = await Branch.findById(branch);
//       if (!branchExists) {
//         console.log('Validation failed: Branch not found:', branch);
//         return res.status(400).json({ message: 'Invalid branch ID' });
//       }
//       updateData.branch = branch;
//     }
//     if (department && (isCreator || isAdmin || isSuperAdmin)) {
//       const departmentExists = await Department.findById(department);
//       if (!departmentExists) {
//         console.log('Validation failed: Department not found:', department);
//         return res.status(400).json({ message: 'Invalid department ID' });
//       }
//       updateData.department = department;
//     }
//     if (assignedTo && (isCreator || isAdmin || isSuperAdmin)) {
//       const userExists = await User.findById(assignedTo);
//       if (!userExists) {
//         console.log('Validation failed: Assigned user not found:', assignedTo);
//         return res.status(400).json({ message: 'Invalid assignedTo user ID' });
//       }
//       updateData.assignedTo = assignedTo;
//     }
//     if (description && (isCreator || isAdmin || isSuperAdmin)) updateData.description = description;
//     if (normalizedStatus && (isCreator || isAssignee || isAdmin || isSuperAdmin)) updateData.status = normalizedStatus;
//     if (priority && (isCreator || isAdmin || isSuperAdmin)) updateData.priority = priority;
//     if (rating !== undefined && (isCreator || isAdmin || isSuperAdmin)) updateData.rating = Number(rating);
//     if (feedback !== undefined && (isCreator || isAdmin || isSuperAdmin)) updateData.feedback = feedback;

//     if (req.file && (isCreator || isAdmin || isSuperAdmin)) {
//       console.log('Processing new attachment upload');
//       const result = await new Promise((resolve, reject) => {
//         cloudinary.uploader.upload_stream(
//           {
//             folder: 'bugbuster_issues',
//             resource_type: 'auto',
//           },
//           (error, result) => {
//             if (error) reject(error);
//             resolve(result);
//           }
//         ).end(req.file.buffer);
//       });
//       updateData.attachment = result.secure_url;
//       console.log('New attachment uploaded:', updateData.attachment);

//       if (issue.attachment) {
//         const publicId = issue.attachment.split('/').pop().split('.')[0];
//         console.log('Deleting old attachment with publicId:', publicId);
//         await cloudinary.uploader.destroy(`bugbuster_issues/${publicId}`);
//       }
//     }

//     if (Object.keys(updateData).length === 0) {
//       console.log('No valid fields to update:', updateData);
//       return res.status(400).json({ message: 'No valid fields to update' });
//     }

//     if (normalizedStatus && ['pending', 'in-progress'].includes(normalizedStatus) && rating === undefined && (isCreator || isAdmin || isSuperAdmin)) {
//       console.log('Resetting rating due to status change to pending or in-progress (no new rating provided)');
//       updateData.rating = null;
//     }

//     console.log('Updating issue with data:', updateData);

//     const updatedIssue = await Issue.findByIdAndUpdate(
//       issueId,
//       { $set: updateData },
//       { new: true }
//     )
//       .populate('branch', 'branchCode branchName')
//       .populate('department', 'departmentCode departmentName')
//       .populate('assignedTo', 'name email _id')
//       .populate('createdBy', 'name email _id')
//       // .populate('comments.commentedBy', 'name email _id');

//     if (!updatedIssue) {
//       console.log('Failed to update issue: Updated issue not found');
//       return res.status(500).json({ message: 'Failed to update issue' });
//     }

//     console.log('Updated issue:', {
//       _id: updatedIssue._id,
//       status: updatedIssue.status,
//       rating: updatedIssue.rating,
//       feedback: updatedIssue.feedback,
//     });

//     // Log activity
//     await createActivityLog('update', updatedIssue, user, updateData);

//     if (updateData.status || updateData.assignedTo || updateData.feedback) {
//       console.log('Preparing email notification for issue update');
//       const mailOptions = {
//         from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
//         to: updatedIssue.assignedTo.email,
//         subject: `Task Updated: ${issueId}`,
//         html: `
//           <h2>Task Update Notification</h2>
//           <p>Dear ${updatedIssue.assignedTo.name || 'User'},</p>
//           <p>The task with ID <strong>${issueId}</strong> has been updated by <strong>${user.name || 'Unknown'}</strong>.</p>
//           <p><strong>Task Description:</strong> ${updatedIssue.description}</p>
//           ${updateData.status ? `<p><strong>New Status:</strong> ${updateData.status}</p>` : ''}
//           ${updateData.assignedTo ? `<p><strong>Reassigned To:</strong> ${updatedIssue.assignedTo.name}</p>` : ''}
//           ${updateData.feedback ? `<p><strong>Feedback:</strong> ${updateData.feedback}</p>` : ''}
//           <p>Please review the task and take appropriate action.</p>
//           <p>Best regards,<br/>BUGBUSTER Team</p>
//         `,
//       };

//       try {
//         console.log('Sending email to:', updatedIssue.assignedTo.email);
//         await transporter.sendMail(mailOptions);
//         console.log('Email sent successfully');
//       } catch (emailError) {
//         console.error('Nodemailer error:', emailError);
//       }
//     }

//     res.json({ message: 'Issue updated successfully', issue: updatedIssue });
//   } catch (error) {
//     console.error('Error updating issue:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // Reopen an issue
// router.put('/:id/reopen', authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!mongoose.isValidObjectId(id)) {
//       return res.status(400).json({ message: 'Invalid issue ID' });
//     }

//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const issue = await Issue.findById(id)
//       .populate('assignedTo', 'name email _id')
//       .populate('createdBy', 'name email _id')
//       // .populate('comments.commentedBy', 'name email _id');
//     if (!issue) {
//       return res.status(404).json({ message: 'Issue not found' });
//     }

//     const isSuperAdmin = user.roles.includes('SuperAdmin');
//     const isAdmin = user.roles.includes('Admin');
//     const isCreator = issue.createdBy._id.toString() === req.user.userId;
//     if (!(isSuperAdmin || isAdmin || isCreator)) {
//       return res.status(403).json({
//         message: 'Not authorized to reopen this issue. Only SuperAdmin, Admin, or the task creator can reopen.',
//       });
//     }

//     const previousRating = issue.rating;

//     issue.status = 'pending';
//     issue.rating = null;
//     await issue.save();

//     console.log('Issue assignedTo ID:', issue.assignedTo._id.toString());
//     console.log('Issue createdBy ID:', issue.createdBy._id.toString());
//     console.log('Previous rating:', previousRating);

//     const superAdminsAndAdmins = await User.find({
//       roles: { $in: ['SuperAdmin', 'Admin'] },
//     }).select('_id');
//     const superAdminAndAdminIds = superAdminsAndAdmins.map(user => user._id.toString());
//     console.log('SuperAdmin and Admin IDs:', superAdminAndAdminIds);

//     const feedbackEntries = await Feedback.find({
//       feedbackTo: issue.assignedTo._id,
//       $or: [
//         { createdBy: issue.createdBy._id },
//         { createdBy: { $in: superAdminAndAdminIds.map(id => new mongoose.Types.ObjectId(id)) } },
//       ],
//     })
//       .populate('createdBy', 'name email _id roles')
//       .lean();

//     console.log('Feedback entries found:', feedbackEntries);

//     const ratings = feedbackEntries.map(feedback => ({
//       rating: feedback.rating,
//       feedbackText: feedback.feedback || 'No feedback provided',
//       givenBy: {
//         _id: feedback.createdBy._id,
//         name: feedback.createdBy.name,
//         email: feedback.createdBy.email,
//         roles: feedback.createdBy.roles,
//       },
//       createdAt: feedback.createdAt,
//     }));

//     if (ratings.length > 0) {
//       const latestRating = ratings.reduce((max, current) =>
//         !max.createdAt || current.createdAt > max.createdAt ? current : max
//       ).rating;
//       issue.rating = latestRating;
//       await issue.save();
//       console.log('Updated issue.rating with latest rating:', latestRating);
//     } else if (previousRating !== null) {
//       issue.rating = previousRating;
//       await issue.save();
//       console.log('Restored previous rating:', previousRating);
//     }

//     // Log activity
//     await createActivityLog('reopen', issue, user, { status: 'pending', previousRating });

//     const mailOptions = {
//       from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
//       to: issue.assignedTo.email,
//       subject: `Task Reopened: ${id}`,
//       html: `
//         <h2>Task Reopened Notification</h2>
//         <p>Dear ${issue.assignedTo.name || 'User'},</p>
//         <p>The task with ID <strong>${id}</strong> has been reopened by <strong>${user.name || 'Unknown'}</strong>.</p>
//         <p><strong>Task Description:</strong> ${issue.description || 'No description provided'}</p>
//         <p>Please review the task and take appropriate action.</p>
//         <p>Best regards,<br/>BUGBUSTER Team</p>
//       `,
//     };

//     try {
//       await transporter.sendMail(mailOptions);
//       console.log('Email sent to assigned user:', issue.assignedTo.email);

//       const populatedIssue = await Issue.findById(id)
//         .populate('branch', 'branchCode branchName')
//         .populate('department', 'departmentCode departmentName')
//         .populate('assignedTo', 'name email _id')
//         .populate('createdBy', 'name email _id')
//         // .populate('comments.commentedBy', 'name email _id')
//         .lean();

//       res.status(200).json({
//         message: 'Issue reopened and email sent successfully',
//         issue: populatedIssue,
//         ratingsGiven: ratings,
//       });
//     } catch (emailError) {
//       console.error('Nodemailer error:', emailError);
//       const populatedIssue = await Issue.findById(id)
//         .populate('branch', 'branchCode branchName')
//         .populate('department', 'departmentCode departmentName')
//         .populate('assignedTo', 'name email _id')
//         .populate('createdBy', 'name email _id')
//         // .populate('comments.commentedBy', 'name email _id')
//         .lean();
//       return res.status(200).json({
//         message: 'Issue reopened but failed to send email',
//         issue: populatedIssue,
//         ratingsGiven: ratings,
//         error: emailError.message,
//       });
//     }
//   } catch (error) {
//     console.error('Error reopening issue:', error);
//     res.status(500).json({ message: 'Failed to reopen issue', error: error.message });
//   }
// });

// // Send email notification
// router.post('/send-email', authenticateToken, async (req, res) => {
//   try {
//     const { issueId, assignedToEmail, assignedToName, taskDescription, createdByName, feedback } = req.body;

//     if (!issueId || !assignedToEmail || !taskDescription || !createdByName) {
//       return res.status(400).json({ message: 'Missing required fields: issueId, assignedToEmail, taskDescription, createdByName' });
//     }

//     const issue = await Issue.findById(issueId)
//       .populate('assignedTo', 'name email _id')
//       .populate('createdBy', 'name email _id')
//       // .populate('comments.commentedBy', 'name email _id');
//     if (!issue) {
//       return res.status(404).json({ message: 'Issue not found' });
//     }

//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }
//     const isSuperAdmin = user.roles.includes('SuperAdmin');
//     const isAdmin = user.roles.includes('Admin');
//     const isCreator = issue.createdBy._id.toString() === req.user.userId;
//     if (!(isCreator || isAdmin || isSuperAdmin)) {
//       return res.status(403).json({ message: 'Only the task creator, Admin, or SuperAdmin can send this email' });
//     }

//     if (issue.assignedTo.email !== assignedToEmail) {
//       return res.status(400).json({ message: 'Provided assignee email does not match issue assignee' });
//     }

//     const mailOptions = {
//       from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
//       to: assignedToEmail,
//       subject: `Task Notification: ${issueId}`,
//       html: `
//         <h2>Task Notification</h2>
//         <p>Dear ${assignedToName || 'User'},</p>
//         <p>The task with ID <strong>${issueId}</strong> has been updated by <strong>${createdByName}</strong>.</p>
//         <p><strong>Task Description:</strong> ${taskDescription}</p>
//         ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
//         <p>Please review the task and take appropriate action.</p>
//         <p>Best regards,<br/>BUGBUSTER Team</p>
//       `,
//     };

//     try {
//       await transporter.sendMail(mailOptions);
//       // Log activity
//       await createActivityLog('send-email', issue, user, { emailSentTo: assignedToEmail, feedback });
//       res.status(200).json({ message: 'Email sent successfully' });
//     } catch (emailError) {
//       console.error('Nodemailer error:', emailError);
//       return res.status(500).json({ message: 'Failed to send email', error: emailError.message });
//     }
//   } catch (error) {
//     console.error('Error sending email:', error);
//     res.status(500).json({ message: 'Failed to send email', error: error.message });
//   }
// });

// // Get average rating
// router.get('/ratings/:userId/average', authenticateToken, async (req, res) => {
//   try {
//     const { userId } = req.params;

//     if (!mongoose.isValidObjectId(userId)) {
//       return res.status(400).json({ message: 'Invalid user ID' });
//     }

//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const isSuperAdmin = user.roles.includes('SuperAdmin');
//     const isAdmin = user.roles.includes('Admin');
//     if (!(isSuperAdmin || isAdmin || req.user.userId === userId)) {
//       return res.status(403).json({ message: 'Not authorized to view this user’s ratings' });
//     }

//     const feedbackEntries = await Feedback.find({ feedbackTo: userId });
//     console.log(feedbackEntries);

//     if (feedbackEntries.length === 0) {
//       return res.status(404).json({ message: 'No feedback ratings found for this user' });
//     }

//     const totalRating = feedbackEntries.reduce((sum, feedback) => sum + feedback.rating, 0);
//     const averageRating = totalRating / feedbackEntries.length;

//     const ratedUser = await User.findById(userId, 'name email _id');
//     if (!ratedUser) {
//       return res.status(404).json({ message: 'Rated user not found' });
//     }

//     res.json({
//       userId,
//       userName: ratedUser.name,
//       userEmail: ratedUser.email,
//       averageRating: Number(averageRating.toFixed(2)),
//       totalRatings: feedbackEntries.length,
//     });
//   } catch (error) {
//     console.error('Error getting average rating:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // Delete an issue
// router.delete('/:id', authenticateToken, async (req, res) => {
//   try {
//     const issueId = req.params.id;
//     const issue = await Issue.findById(issueId)
//       .populate('branch', 'branchCode branchName')
//       .populate('department', 'departmentCode departmentName')
//       .populate('assignedTo', 'name email _id')
//       .populate('createdBy', 'name email _id')
//       // .populate('comments.commentedBy', 'name email _id');
//     if (!issue) {
//       return res.status(404).json({ message: 'Issue not found' });
//     }

//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const isSuperAdmin = user.roles.includes('SuperAdmin');
//     const isAdmin = user.roles.includes('Admin');
//     const isIssueOwner = req.user.userId === issue.createdBy._id.toString();

//     if (!(isSuperAdmin || isAdmin || isIssueOwner)) {
//       return res.status(403).json({ message: 'Not authorized to delete this issue' });
//     }

//     const deletedLog = new DeletedLog({
//       entityType: 'Issue',
//       entityDetails: {
//         userName: issue.userName,
//         branch: issue.branch
//           ? { _id: issue.branch._id, branchCode: issue.branch.branchCode, branchName: issue.branch.branchName }
//           : null,
//         department: issue.department
//           ? {
//             _id: issue.department._id,
//             departmentCode: issue.department.departmentCode,
//             departmentName: issue.department.departmentName,
//           }
//           : null,
//         assignedTo: issue.assignedTo
//           ? { _id: issue.assignedTo._id, name: issue.assignedTo.name, email: issue.assignedTo.email }
//           : null,
//         description: issue.description,
//         status: issue.status,
//         priority: issue.priority,
//         attachment: issue.attachment,
//         rating: issue.rating,
//         feedback: issue.feedback,
//         comments: issue.comments,
//         createdAt: issue.createdAt,
//         updatedAt: issue.updatedAt,
//       },
//       deletedBy: {
//         userId: req.user.userId,
//         name: user.name || 'Unknown',
//         email: user.email || 'Unknown',
//       },
//       deletedAt: new Date(),
//       reason: req.body.reason || '',
//     });
//     await deletedLog.save();

//     // Log activity
//     await createActivityLog('delete', issue, user, { reason: req.body.reason || '' });

//     if (issue.attachment) {
//       const publicId = issue.attachment.split('/').pop().split('.')[0];
//       await cloudinary.uploader.destroy(`bugbuster_issues/${publicId}`);
//     }

//     await Issue.findByIdAndDelete(issueId);

//     const mailOptions = {
//       from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
//       to: issue.assignedTo.email,
//       subject: `Task Deleted: ${issueId}`,
//       html: `
//         <h2>Task Deletion Notification</h2>
//         <p>Dear ${issue.assignedTo.name || 'User'},</p>
//         <p>The task with ID <strong>${issueId}</strong> has been deleted by <strong>${user.name || 'Unknown'}</strong>.</p>
//         <p><strong>Task Description:</strong> ${issue.description}</p>
//         <p>Best regards,<br/>BUGBUSTER Team</p>
//       `,
//     };

//     try {
//       await transporter.sendMail(mailOptions);
//       console.log('Email sent to assignee:', issue.assignedTo.email);
//     } catch (emailError) {
//       console.error('Nodemailer error:', emailError);
//     }

//     res.json({ message: 'Issue deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting issue:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // Get activity logs for an issue
// router.get('/:id/activities', authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.isValidObjectId(id)) {
//       return res.status(400).json({ message: 'Invalid issue ID' });
//     }

//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const logs = await ActivityLog.find({ entityId: id })
//       .populate('performedBy.userId', 'name email _id')
//       .sort({ performedAt: -1 });

//     res.json(logs);
//   } catch (error) {
//     console.error('Error fetching activity logs:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const Issue = require('../model/Issue');
const Branch = require('../model/Branch');
const Department = require('../model/Department');
const User = require('../model/User');
const DeletedLog = require('../model/DeletedLogs');
const ActivityLog = require('../model/ActivityLog');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const { default: mongoose } = require('mongoose');
const Feedback = require('../model/Feedback');
const { log } = require('console');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png) and PDFs are allowed'));
    }
  },
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Helper function to get user role string
const getUserRoleString = (roles) => {
  if (roles.includes('SuperAdmin')) return 'SuperAdmin';
  if (roles.includes('Admin')) return 'Admin';
  if (roles.includes('ServiceProvider')) return 'ServiceProvider';
  if (roles.includes('EndUser')) return 'EndUser';
  return 'User';
};

// Helper function to create activity log
const createActivityLog = async (action, issue, user, message, changes = {}) => {
  try {
    const activityLog = new ActivityLog({
      action,
      entityId: issue._id,
      performedBy: {
        userId: user.userId,
        name: user.name || 'Unknown',
        email: user.email || 'Unknown',
      },
      message,
      changes,
    });
    await activityLog.save();
    console.log(`Activity log created for ${action} on issue ${issue._id}: ${message}`);
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
};

// Get dropdown data
router.get('/dropdowns', authenticateToken, async (req, res) => {
  try {
    const branches = await Branch.find().select('branchCode branchName');
    const departments = await Department.find().select('departmentCode departmentName');
    const users = await User.find({
      _id: { $ne: req.user.userId },
      roles: { $in: ['ServiceProvider'] },
      $nor: [{ roles: { $size: 1, $eq: ['EndUser'] } }],
    }).select('name email branch department _id roles');

    res.json({ branches, departments, users });
  } catch (error) {
    console.error('Get dropdowns error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single issue by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

    const issue = await Issue.findById(id)
      .populate('branch', 'branchCode branchName')
      .populate('department', 'departmentCode departmentName')
      .populate('assignedTo', 'name email _id')
      .populate('createdBy', 'name email _id');

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    res.json(issue);

    const user = await User.findById(req.user.userId);
    await createActivityLog('view', issue, req.user, `Issue ${issue._id} viewed by ${getUserRoleString(user.roles)} ${user.name}`);

  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get issues
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { assignedTo, createdBy } = req.query;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const validUsers = await User.find().select('_id');
    const validUserIds = validUsers.map(user => user._id.toString());
    console.log('Valid user IDs:', validUserIds);

    const query = {};

    if (assignedTo && createdBy) {
      if (!validUserIds.includes(assignedTo) || !validUserIds.includes(createdBy)) {
        console.log('Invalid user ID in query:', { assignedTo, createdBy });
        return res.json([]);
      }
      query.$or = [
        { assignedTo: assignedTo },
        { createdBy: createdBy },
      ];
    } else {
      if (assignedTo) {
        if (!validUserIds.includes(assignedTo)) {
          console.log('Invalid assignedTo ID:', assignedTo);
          return res.json([]);
        }
        query.assignedTo = assignedTo;
      }
      if (createdBy) {
        if (!validUserIds.includes(createdBy)) {
          console.log('Invalid createdBy ID:', createdBy);
          return res.json([]);
        }
        query.createdBy = createdBy;
      }
    }

    query.$and = [
      { $or: [{ assignedTo: { $in: validUserIds } }, { assignedTo: null }] },
      { createdBy: { $in: validUserIds } },
    ];

    console.log('Constructed query:', JSON.stringify(query, null, 2));

    let sortCriteria = { createdAt: -1 };
    if (createdBy && assignedTo) {
      sortCriteria = { createdAt: -1 };
    } else if (createdBy) {
      sortCriteria = { createdBy: 1, createdAt: -1 };
    } else if (assignedTo) {
      sortCriteria = { assignedTo: 1, createdAt: -1 };
    }
    console.log('Sort criteria:', sortCriteria);

    const issues = await Issue.find(query)
      .populate('branch', 'branchCode branchName')
      .populate('department', 'departmentCode departmentName')
      .populate('assignedTo', 'name email _id')
      .populate('createdBy', 'name email _id')
      .sort(sortCriteria);

    console.log(`Found ${issues.length} issues`);

    res.json(issues);
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new issue
router.post('/', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const { userName, branch, department, assignedTo, description, status, priority } = req.body;

    console.log('POST /api/issues payload:', req.body);
    console.log('File:', req.file);

    if (!userName || !branch || !department || !assignedTo || !description || !status || !priority) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (!['High', 'Medium', 'Low'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority value' });
    }

    if (!['pending', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const userExists = await User.findById(assignedTo);
    if (!userExists) {
      return res.status(400).json({ message: 'Invalid assignedTo user ID' });
    }

    const branchExists = await Branch.findById(branch);
    if (!branchExists) {
      return res.status(400).json({ message: 'Invalid branch ID' });
    }

    const departmentExists = await Department.findById(department);
    if (!departmentExists) {
      return res.status(400).json({ message: 'Invalid department ID' });
    }

    const creator = await User.findById(req.user.userId);
    if (!creator) {
      return res.status(404).json({ message: 'Creator user not found' });
    }

    let attachmentUrl = null;
    if (req.file) {
      console.log('Uploading to Cloudinary...');
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'bugbuster_issues',
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              return reject(error);
            }
            resolve(result);
          }
        ).end(req.file.buffer);
      });
      attachmentUrl = result.secure_url;
      console.log('Cloudinary URL:', attachmentUrl);
    }

    const issue = new Issue({
      userName,
      branch,
      department,
      assignedTo,
      description,
      status,
      priority,
      attachment: attachmentUrl,
      createdBy: req.user.userId,
      comments: "",
    });

    const savedIssue = await issue.save();
    console.log('Saved issue:', savedIssue);

    const populatedIssue = await Issue.findById(savedIssue._id)
      .populate('branch', 'branchCode branchName')
      .populate('department', 'departmentCode departmentName')
      .populate('assignedTo', 'name email _id')
      .populate('createdBy', 'name email _id');

    // Log activity
    const creatorRole = getUserRoleString(creator.roles);
    await createActivityLog(
      'create',
      populatedIssue,
      creator,
      `Issue ${populatedIssue._id} created by ${creatorRole} ${creator.name} and assigned to ${userExists.name}`,
      { userName, branch, department, assignedTo, description, status, priority }
    );

    // Send email notification to assignee
    const mailOptions = {
      from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
      to: userExists.email,
      subject: `New Task Assigned: ${savedIssue._id}`,
      html: `
        <h2>New Task Notification</h2>
        <p>Dear ${userExists.name || 'User'},</p>
        <p>You have been assigned a new task with ID <strong>${savedIssue._id}</strong> by <strong>${creatorRole} ${creator.name || 'Unknown'}</strong>.</p>
        <p><strong>Task Description:</strong> ${description}</p>
        <p><strong>Priority:</strong> ${priority}</p>
        <p>Please review the task and take appropriate action.</p>
        <p>Best regards,<br/>BUGBUSTER Team</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent to assignee:', userExists.email);
    } catch (emailError) {
      console.error('Nodemailer error:', emailError);
    }

    res.status(201).json({ message: 'Issue created successfully', issue: populatedIssue });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update an issue
router.put('/:id', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const issueId = req.params.id;
    console.log('PUT /api/issues/:id - Request received for issue ID:', issueId);
    console.log('Request body:', req.body);
    console.log('Authenticated user ID:', req.user.userId);

    const { userName, branch, department, assignedTo, description, status, priority, rating, feedback, comments } = req.body;

    const normalizedStatus = status ? status.toLowerCase() : status;
    console.log('Parsed payload:', {
      userName,
      branch,
      department,
      assignedTo,
      description,
      status: normalizedStatus,
      priority,
      rating,
      feedback,
      comments,
    });

    if (priority && !['High', 'Medium', 'Low'].includes(priority)) {
      console.log('Validation failed: Invalid priority value:', priority);
      return res.status(400).json({ message: 'Invalid priority value' });
    }

    if (normalizedStatus && !['pending', 'in-progress', 'resolved'].includes(normalizedStatus)) {
      console.log('Validation failed: Invalid status value:', normalizedStatus);
      return res.status(400).json({ message: 'Invalid status value' });
    }

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        console.log('Validation failed: Invalid rating value:', rating);
        return res.status(400).json({ message: 'Rating must be a number between 0 and 5' });
      }
      console.log('Rating validated:', ratingNum);
    }

    if (feedback !== undefined) {
      if (typeof feedback !== 'string') {
        console.log('Validation failed: Feedback is not a string:', feedback);
        return res.status(400).json({ message: 'Feedback must be a string' });
      }
      if (feedback.length > 500) {
        console.log('Validation failed: Feedback exceeds 500 characters:', feedback.length);
        return res.status(400).json({ message: 'Feedback cannot exceed 500 characters' });
      }
      console.log('Feedback validated:', feedback);
    }

    console.log('Fetching issue with ID:', issueId);
    const issue = await Issue.findById(issueId)
      .populate('assignedTo', '_id name email')
      .populate('createdBy', '_id name email');
    if (!issue) {
      console.log('Issue not found for ID:', issueId);
      return res.status(404).json({ message: 'Issue not found' });
    }
    console.log('Found issue:', {
      _id: issue._id,
      createdBy: issue.createdBy?._id,
      assignedTo: issue.assignedTo?._id,
      status: issue.status,
      rating: issue.rating,
      feedback: issue.feedback,
    });

    console.log('Fetching user with ID:', req.user.userId);
    const user = await User.findById(req.user.userId);
    if (!user) {
      console.log('User not found for ID:', req.user.userId);
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('Found user:', {
      _id: user._id,
      name: user.name,
      roles: user.roles,
    });

    const isSuperAdmin = user.roles.includes('SuperAdmin');
    const isAdmin = user.roles.includes('Admin');
    const isAssignee = issue.assignedTo && issue.assignedTo._id.toString() === req.user.userId;
    const isCreator = issue.createdBy && issue.createdBy._id.toString() === req.user.userId;

    console.log('Permission check:', {
      isSuperAdmin,
      isAdmin,
      isAssignee,
      isCreator,
    });

    if ((rating !== undefined || feedback !== undefined) && !(isCreator || isAdmin || isSuperAdmin)) {
      console.log('Permission denied: User cannot update rating or feedback');
      return res.status(403).json({ message: 'Only the task creator, Admin, or SuperAdmin can provide rating or feedback' });
    }

    if (normalizedStatus && !(isCreator || isAssignee || isAdmin || isSuperAdmin)) {
      console.log('Permission denied: User cannot update status');
      return res.status(403).json({ message: 'Only the creator, assignee, Admin, or SuperAdmin can update status' });
    }

    const updateData = {};
    if (userName && (isCreator || isAdmin || isSuperAdmin)) updateData.userName = userName;
    if (comments && (isAssignee || isAdmin || isSuperAdmin)) {
      if (!comments) {
        console.log('Validation failed: Comments must be non empty');
        return res.status(400).json({ message: 'Comments must be non empty' });
      }
      updateData.comments = comments;
    }
    if (branch && (isCreator || isAdmin || isSuperAdmin)) {
      const branchExists = await Branch.findById(branch);
      if (!branchExists) {
        console.log('Validation failed: Branch not found:', branch);
        return res.status(400).json({ message: 'Invalid branch ID' });
      }
      updateData.branch = branch;
    }
    if (department && (isCreator || isAdmin || isSuperAdmin)) {
      const departmentExists = await Department.findById(department);
      if (!departmentExists) {
        console.log('Validation failed: Department not found:', department);
        return res.status(400).json({ message: 'Invalid department ID' });
      }
      updateData.department = department;
    }
    if (assignedTo && (isCreator || isAdmin || isSuperAdmin)) {
      const userExists = await User.findById(assignedTo);
      if (!userExists) {
        console.log('Validation failed: Assigned user not found:', assignedTo);
        return res.status(400).json({ message: 'Invalid assignedTo user ID' });
      }
      updateData.assignedTo = assignedTo;
    }
    if (description && (isCreator || isAdmin || isSuperAdmin)) updateData.description = description;
    if (normalizedStatus && (isCreator || isAssignee || isAdmin || isSuperAdmin)) updateData.status = normalizedStatus;
    if (priority && (isCreator || isAdmin || isSuperAdmin)) updateData.priority = priority;
    if (rating !== undefined && (isCreator || isAdmin || isSuperAdmin)) updateData.rating = Number(rating);
    if (feedback !== undefined && (isCreator || isAdmin || isSuperAdmin)) updateData.feedback = feedback;

    if (req.file && (isCreator || isAdmin || isSuperAdmin)) {
      console.log('Processing new attachment upload');
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'bugbuster_issues',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            resolve(result);
          }
        ).end(req.file.buffer);
      });
      updateData.attachment = result.secure_url;
      console.log('New attachment uploaded:', updateData.attachment);

      if (issue.attachment) {
        const publicId = issue.attachment.split('/').pop().split('.')[0];
        console.log('Deleting old attachment with publicId:', publicId);
        await cloudinary.uploader.destroy(`bugbuster_issues/${publicId}`);
      }
    }

    if (Object.keys(updateData).length === 0) {
      console.log('No valid fields to update:', updateData);
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    if (normalizedStatus && ['pending', 'in-progress'].includes(normalizedStatus) && rating === undefined && (isCreator || isAdmin || isSuperAdmin)) {
      console.log('Resetting rating due to status change to pending or in-progress (no new rating provided)');
      updateData.rating = null;
    }

    console.log('Updating issue with data:', updateData);

    const updatedIssue = await Issue.findByIdAndUpdate(
      issueId,
      { $set: updateData },
      { new: true }
    )
      .populate('branch', 'branchCode branchName')
      .populate('department', 'departmentCode departmentName')
      .populate('assignedTo', 'name email _id')
      .populate('createdBy', 'name email _id');

    if (!updatedIssue) {
      console.log('Failed to update issue: Updated issue not found');
      return res.status(500).json({ message: 'Failed to update issue' });
    }

    console.log('Updated issue:', {
      _id: updatedIssue._id,
      status: updatedIssue.status,
      rating: updatedIssue.rating,
      feedback: updatedIssue.feedback,
    });

    // Log activity
    const userRole = getUserRoleString(user.roles);
    let activityMessage = `Issue ${issueId} updated by ${userRole} ${user.name}`;
    const activityChanges = { ...updateData };

    if (updateData.assignedTo) {
      const newAssignee = await User.findById(updateData.assignedTo);
      activityMessage = `You have been assigned issue ${issueId} by ${userRole} ${user.name}`;
      activityChanges.assignedToName = newAssignee.name;
    }
    if (updateData.rating !== undefined) {
      activityMessage = `${userRole} ${user.name} gave a rating of ${updateData.rating} to issue ${issueId}`;
    }
    if (updateData.feedback !== undefined) {
      activityMessage = `${userRole} ${user.name} provided feedback to issue ${issueId}: ${updateData.feedback}`;
    }
    if (updateData.status === 'resolved') {
      activityMessage = `${userRole} ${user.name} resolved issue ${issueId} assigned by ${getUserRoleString(updatedIssue.createdBy.roles)} ${updatedIssue.createdBy.name}`;
    }

    await createActivityLog('update', updatedIssue, user, activityMessage, activityChanges);

    if (updateData.status || updateData.assignedTo || updateData.feedback) {
      console.log('Preparing email notification for issue update');
      const mailOptions = {
        from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
        to: updatedIssue.assignedTo.email,
        subject: `Task Updated: ${issueId}`,
        html: `
          <h2>Task Update Notification</h2>
          <p>Dear ${updatedIssue.assignedTo.name || 'User'},</p>
          <p>The task with ID <strong>${issueId}</strong> has been updated by <strong>${userRole} ${user.name || 'Unknown'}</strong>.</p>
          <p><strong>Task Description:</strong> ${updatedIssue.description}</p>
          ${updateData.status ? `<p><strong>New Status:</strong> ${updateData.status}</p>` : ''}
          ${updateData.assignedTo ? `<p><strong>Reassigned To:</strong> ${updatedIssue.assignedTo.name}</p>` : ''}
          ${updateData.feedback ? `<p><strong>Feedback:</strong> ${updateData.feedback}</p>` : ''}
          <p>Please review the task and take appropriate action.</p>
          <p>Best regards,<br/>BUGBUSTER Team</p>
        `,
      };

      try {
        console.log('Sending email to:', updatedIssue.assignedTo.email);
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
      } catch (emailError) {
        console.error('Nodemailer error:', emailError);
      }
    }

    res.json({ message: 'Issue updated successfully', issue: updatedIssue });
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reopen an issue
router.put('/:id/reopen', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const issue = await Issue.findById(id)
      .populate('assignedTo', 'name email _id')
      .populate('createdBy', 'name email _id');
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const isSuperAdmin = user.roles.includes('SuperAdmin');
    const isAdmin = user.roles.includes('Admin');
    const isCreator = issue.createdBy._id.toString() === req.user.userId;
    if (!(isSuperAdmin || isAdmin || isCreator)) {
      return res.status(403).json({
        message: 'Not authorized to reopen this issue. Only SuperAdmin, Admin, or the task creator can reopen.',
      });
    }

    const previousRating = issue.rating;

    issue.status = 'pending';
    issue.rating = null;
    await issue.save();

    console.log('Issue assignedTo ID:', issue.assignedTo._id.toString());
    console.log('Issue createdBy ID:', issue.createdBy._id.toString());
    console.log('Previous rating:', previousRating);

    const superAdminsAndAdmins = await User.find({
      roles: { $in: ['SuperAdmin', 'Admin'] },
    }).select('_id');
    const superAdminAndAdminIds = superAdminsAndAdmins.map(user => user._id.toString());
    console.log('SuperAdmin and Admin IDs:', superAdminAndAdminIds);

    const feedbackEntries = await Feedback.find({
      feedbackTo: issue.assignedTo._id,
      $or: [
        { createdBy: issue.createdBy._id },
        { createdBy: { $in: superAdminAndAdminIds.map(id => new mongoose.Types.ObjectId(id)) } },
      ],
    })
      .populate('createdBy', 'name email _id roles')
      .lean();

    console.log('Feedback entries found:', feedbackEntries);

    const ratings = feedbackEntries.map(feedback => ({
      rating: feedback.rating,
      feedbackText: feedback.feedback || 'No feedback provided',
      givenBy: {
        _id: feedback.createdBy._id,
        name: feedback.createdBy.name,
        email: feedback.createdBy.email,
        roles: feedback.createdBy.roles,
      },
      createdAt: feedback.createdAt,
    }));

    if (ratings.length > 0) {
      const latestRating = ratings.reduce((max, current) =>
        !max.createdAt || current.createdAt > max.createdAt ? current : max
      ).rating;
      issue.rating = latestRating;
      await issue.save();
      console.log('Updated issue.rating with latest rating:', latestRating);
    } else if (previousRating !== null) {
      issue.rating = previousRating;
      await issue.save();
      console.log('Restored previous rating:', previousRating);
    }

    // Log activity
    const userRole = getUserRoleString(user.roles);
    await createActivityLog(
      'reopen',
      issue,
      user,
      `${userRole} ${user.name} reopened issue ${id} and assigned it again to ${issue.assignedTo.name}`,
      { status: 'pending', previousRating }
    );

    const mailOptions = {
      from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
      to: issue.assignedTo.email,
      subject: `Task Reopened: ${id}`,
      html: `
        <h2>Task Reopened Notification</h2>
        <p>Dear ${issue.assignedTo.name || 'User'},</p>
        <p>The task with ID <strong>${id}</strong> has been reopened by <strong>${userRole} ${user.name || 'Unknown'}</strong> and assigned to you again.</p>
        <p><strong>Task Description:</strong> ${issue.description || 'No description provided'}</p>
        <p>Please review the task and take appropriate action.</p>
        <p>Best regards,<br/>BUGBUSTER Team</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent to assigned user:', issue.assignedTo.email);

      const populatedIssue = await Issue.findById(id)
        .populate('branch', 'branchCode branchName')
        .populate('department', 'departmentCode departmentName')
        .populate('assignedTo', 'name email _id')
        .populate('createdBy', 'name email _id')
        .lean();

      res.status(200).json({
        message: 'Issue reopened and email sent successfully',
        issue: populatedIssue,
        ratingsGiven: ratings,
      });
    } catch (emailError) {
      console.error('Nodemailer error:', emailError);
      const populatedIssue = await Issue.findById(id)
        .populate('branch', 'branchCode branchName')
        .populate('department', 'departmentCode departmentName')
        .populate('assignedTo', 'name email _id')
        .populate('createdBy', 'name email _id')
        .lean();
      return res.status(200).json({
        message: 'Issue reopened but failed to send email',
        issue: populatedIssue,
        ratingsGiven: ratings,
        error: emailError.message,
      });
    }
  } catch (error) {
    console.error('Error reopening issue:', error);
    res.status(500).json({ message: 'Failed to reopen issue', error: error.message });
  }
});

// Send email notification
router.post('/send-email', authenticateToken, async (req, res) => {
  try {
    const { issueId, assignedToEmail, assignedToName, taskDescription, createdByName, feedback } = req.body;

    if (!issueId || !assignedToEmail || !taskDescription || !createdByName) {
      return res.status(400).json({ message: 'Missing required fields: issueId, assignedToEmail, taskDescription, createdByName' });
    }

    const issue = await Issue.findById(issueId)
      .populate('assignedTo', 'name email _id')
      .populate('createdBy', 'name email _id');
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isSuperAdmin = user.roles.includes('SuperAdmin');
    const isAdmin = user.roles.includes('Admin');
    const isCreator = issue.createdBy._id.toString() === req.user.userId;
    if (!(isCreator || isAdmin || isSuperAdmin)) {
      return res.status(403).json({ message: 'Only the task creator, Admin, or SuperAdmin can send this email' });
    }

    if (issue.assignedTo.email !== assignedToEmail) {
      return res.status(400).json({ message: 'Provided assignee email does not match issue assignee' });
    }

    const userRole = getUserRoleString(user.roles);
    const mailOptions = {
      from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
      to: assignedToEmail,
      subject: `Task Notification: ${issueId}`,
      html: `
        <h2>Task Notification</h2>
        <p>Dear ${assignedToName || 'User'},</p>
        <p>The task with ID <strong>${issueId}</strong> has been updated by <strong>${userRole} ${createdByName}</strong>.</p>
        <p><strong>Task Description:</strong> ${taskDescription}</p>
        ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
        <p>Please review the task and take appropriate action.</p>
        <p>Best regards,<br/>BUGBUSTER Team</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      // Log activity
      await createActivityLog(
        'send-email',
        issue,
        user,
        `Email notification sent to ${assignedToName} for issue ${issueId} by ${userRole} ${user.name}`,
        { emailSentTo: assignedToEmail, feedback }
      );
      res.status(200).json({ message: 'Email sent successfully' });
    } catch (emailError) {
      console.error('Nodemailer error:', emailError);
      return res.status(500).json({ message: 'Failed to send email', error: emailError.message });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
});

// Get average rating
router.get('/ratings/:userId/average', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isSuperAdmin = user.roles.includes('SuperAdmin');
    const isAdmin = user.roles.includes('Admin');
    if (!(isSuperAdmin || isAdmin || req.user.userId === userId)) {
      return res.status(403).json({ message: 'Not authorized to view this user’s ratings' });
    }

    const feedbackEntries = await Feedback.find({ feedbackTo: userId });
    console.log(feedbackEntries);

    if (feedbackEntries.length === 0) {
      return res.status(404).json({ message: 'No feedback ratings found for this user' });
    }

    const totalRating = feedbackEntries.reduce((sum, feedback) => sum + feedback.rating, 0);
    const averageRating = totalRating / feedbackEntries.length;

    const ratedUser = await User.findById(userId, 'name email _id');
    if (!ratedUser) {
      return res.status(404).json({ message: 'Rated user not found' });
    }

    res.json({
      userId,
      userName: ratedUser.name,
      userEmail: ratedUser.email,
      averageRating: Number(averageRating.toFixed(2)),
      totalRatings: feedbackEntries.length,
    });
  } catch (error) {
    console.error('Error getting average rating:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete an issue
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const issueId = req.params.id;
    const issue = await Issue.findById(issueId)
      .populate('branch', 'branchCode branchName')
      .populate('department', 'departmentCode departmentName')
      .populate('assignedTo', 'name email _id')
      .populate('createdBy', 'name email _id');
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isSuperAdmin = user.roles.includes('SuperAdmin');
    const isAdmin = user.roles.includes('Admin');
    const isIssueOwner = req.user.userId === issue.createdBy._id.toString();

    if (!(isSuperAdmin || isAdmin || isIssueOwner)) {
      return res.status(403).json({ message: 'Not authorized to delete this issue' });
    }

    const deletedLog = new DeletedLog({
      entityType: 'Issue',
      entityDetails: {
        userName: issue.userName,
        branch: issue.branch
          ? { _id: issue.branch._id, branchCode: issue.branch.branchCode, branchName: issue.branch.branchName }
          : null,
        department: issue.department
          ? {
            _id: issue.department._id,
            departmentCode: issue.department.departmentCode,
            departmentName: issue.department.departmentName,
          }
          : null,
        assignedTo: issue.assignedTo
          ? { _id: issue.assignedTo._id, name: issue.assignedTo.name, email: issue.assignedTo.email }
          : null,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        attachment: issue.attachment,
        rating: issue.rating,
        feedback: issue.feedback,
        comments: issue.comments,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
      },
      deletedBy: {
        userId: req.user.userId,
        name: user.name || 'Unknown',
        email: user.email || 'Unknown',
      },
      deletedAt: new Date(),
      reason: req.body.reason || '',
    });
    await deletedLog.save();

    // Log activity
    const userRole = getUserRoleString(user.roles);
    await createActivityLog(
      'delete',
      issue,
      user,
      `Issue ${issueId} has been deleted by ${userRole} ${user.name}`,
      { reason: req.body.reason || '' }
    );

    if (issue.attachment) {
      const publicId = issue.attachment.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`bugbuster_issues/${publicId}`);
    }

    await Issue.findByIdAndDelete(issueId);

    const mailOptions = {
      from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
      to: issue.assignedTo.email,
      subject: `Task Deleted: ${issueId}`,
      html: `
        <h2>Task Deletion Notification</h2>
        <p>Dear ${issue.assignedTo.name || 'User'},</p>
        <p>Your issue with ID <strong>${issueId}</strong> has been deleted by <strong>${userRole} ${user.name || 'Unknown'}</strong>.</p>
        <p><strong>Task Description:</strong> ${issue.description}</p>
        <p>Best regards,<br/>BUGBUSTER Team</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent to assignee:', issue.assignedTo.email);
    } catch (emailError) {
      console.error('Nodemailer error:', emailError);
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get activity logs for an issue
router.get('/:id/activities', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid issue ID' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const logs = await ActivityLog.find({ entityId: id })
      .populate('performedBy.userId', 'name email _id')
      .sort({ performedAt: -1 });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;