const express = require('express');
const router = express.Router();
const Feedback = require('../model/Feedback');
const User = require('../model/User');
const Branch = require('../model/Branch');
const Department = require('../model/Department');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, JPG, PNG, and PDF files are allowed'));
        }
    },
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Helper function to validate feedback input
const validateFeedbackInput = ({ userName, branch, department, feedbackTo, rating, feedback }) => {
    if (!userName || !branch || !department || !feedbackTo || rating === undefined) {
        return 'All required fields (userName, branch, department, feedbackTo, rating) must be provided';
    }
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
        return 'Rating must be a number between 0 and 5';
    }
    if (feedback && typeof feedback !== 'string') {
        return 'Feedback must be a string';
    }
    if (feedback && feedback.length > 500) {
        return 'Feedback cannot exceed 500 characters';
    }
    return null;
};

// Helper function to send email notification
const sendFeedbackEmail = async (feedbackToUser, creator, branchName, departmentName, rating, feedback) => {
    const mailOptions = {
        from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
        to: feedbackToUser.email,
        subject: 'New Feedback Received',
        html: `
            <h2>Feedback Notification</h2>
            <p>Dear ${feedbackToUser.name || 'User'},</p>
            <p>You have received new feedback from <strong>${creator.name || 'Unknown'}</strong>.</p>
            <p><strong>Rating:</strong> ${rating}/5</p>
            ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
            <p><strong>Branch:</strong> ${branchName}</p>
            <p><strong>Department:</strong> ${departmentName}</p>
            <p>Best regards,<br/>BUGBUSTER Team</p>
        `,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent to feedback recipient:', feedbackToUser.email);
    } catch (emailError) {
        console.error('Nodemailer error:', emailError);
    }
};

// Create a new feedback
router.post('/', authenticateToken, upload.single('attachment'), async (req, res) => {
    try {
        const { userName, branch, department, feedbackTo, rating, feedback } = req.body;

        // Log incoming payload
        console.log('POST /api/feedback payload:', req.body);
        if (req.file) console.log('Uploaded file:', req.file.originalname);

        // Validate input
        const validationError = validateFeedbackInput({ userName, branch, department, feedbackTo, rating, feedback });
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        // Validate branch, department, and feedbackTo
        const [branchExists, departmentExists, feedbackToUser] = await Promise.all([
            Branch.findById(branch),
            Department.findById(department),
            User.findById(feedbackTo),
        ]);
        if (!branchExists) return res.status(400).json({ message: 'Invalid branch ID' });
        if (!departmentExists) return res.status(400).json({ message: 'Invalid department ID' });
        if (!feedbackToUser) return res.status(400).json({ message: 'Invalid feedbackTo user ID' });

        // Check user permissions
        const creator = await User.findById(req.user.userId);
        if (!creator) return res.status(404).json({ message: 'Creator user not found' });

        // Handle file upload (if any)
        let attachmentUrl = null;
        if (req.file) {
            // Implement your file upload logic here (e.g., upload to S3, save to disk, etc.)
            // For now, we'll assume a placeholder URL
            attachmentUrl = `/uploads/${req.file.originalname}`;
        }

        // Create feedback
        const newFeedback = new Feedback({
            userName,
            branch,
            department,
            feedbackTo,
            rating: Number(rating),
            feedback: feedback || '',
            createdBy: req.user.userId, // Corrected from feedbackTo to createdBy
            attachment: attachmentUrl,
        });

        const savedFeedback = await newFeedback.save();
        console.log('Saved feedback:', savedFeedback);

        // Populate fields for response
        const populatedFeedback = await Feedback.findById(savedFeedback._id)
            .populate('branch', 'branchCode branchName')
            .populate('department', 'departmentCode departmentName')
            .populate('feedbackTo', 'name email _id')
            .populate('createdBy', 'name email _id');

        // Send email notification
        await sendFeedbackEmail(
            feedbackToUser,
            creator,
            branchExists.branchName,
            departmentExists.departmentName,
            Number(rating),
            feedback
        );

        res.status(201).json({ message: 'Feedback created successfully', feedback: populatedFeedback });
    } catch (error) {
        console.error('Error creating feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get feedback entries
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { user, branch, department, sortByRating, searchFeedback } = req.query;

        const userAuth = await User.findById(req.user.userId);
        if (!userAuth) return res.status(404).json({ message: 'User not found' });

        // Build query
        const query = {};
        const isAdmin = userAuth.roles.includes('Admin') || userAuth.roles.includes('SuperAdmin');

        if (!isAdmin) {
            // Non-admins can only see feedback they created or received
            query.$or = [
                { createdBy: req.user.userId },
                { feedbackTo: req.user.userId },
            ];
        }

        // Apply filters for admins
        if (isAdmin) {
            if (user) query.$or = [{ feedbackTo: user }, { createdBy: user }];
            if (branch) query.branch = branch;
            if (department) query.department = department;
        }

        // Search feedback field (case-insensitive)
        if (searchFeedback) {
            query.feedback = { $regex: searchFeedback, $options: 'i' };
        }

        // Determine sort order
        let sortOptions = { createdAt: -1 }; // Default sort by createdAt descending
        if (sortByRating) {
            sortOptions = { rating: sortByRating.toLowerCase() === 'asc' ? 1 : -1 };
        }

        // Fetch feedback entries
        const feedbackEntries = await Feedback.find(query)
            .populate('branch', 'branchCode branchName')
            .populate('department', 'departmentCode departmentName')
            .populate('feedbackTo', 'name email _id')
            .populate('createdBy', 'name email _id')
            .sort(sortOptions);

        if (feedbackEntries.length === 0) {
            return res.status(404).json({ message: 'No feedback entries found matching the criteria' });
        }

        res.json(feedbackEntries);
    } catch (error) {
        console.error('Error getting feedback:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

//dropdowns
router.get('/dropdowns', authenticateToken, async (req, res) => {
  try {
    // Fetch branches and departments for dropdowns
    const branches = await Branch.find().select('branchCode branchName');
    const departments = await Department.find().select('departmentCode departmentName');

    // Fetch all users for the dropdown
    const users = await User.find()
      .select('name email branch department _id roles');
    
    // Log the number of users fetched for debugging
    console.log(`Fetched ${users.length} users for dropdowns`);

    res.json({ branches, departments, users });
  } catch (error) {
    console.error('Get dropdowns error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;