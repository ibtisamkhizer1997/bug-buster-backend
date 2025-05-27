const express = require('express');
const router = express.Router();
const Department = require('../model/Department');
const DeletedLog = require('../model/DeletedLogs');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded user:', decoded); // Debug
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check admin or superadmin role
const adminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.roles || !(req.user.roles.includes('Admin') || req.user.roles.includes('SuperAdmin'))) {
    return res.status(403).json({ message: 'Admin or SuperAdmin access required' });
  }
  next();
};

// Get all departments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new department
router.post('/', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const { departmentCode, departmentName } = req.body;

    if (!departmentCode || !departmentName) {
      return res.status(400).json({ message: 'Department code and name are required' });
    }

    const existingDepartment = await Department.findOne({ departmentCode });
    if (existingDepartment) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    const department = new Department({ departmentCode, departmentName });
    await department.save();

    res.status(201).json({ message: 'Department created successfully', department });
  } catch (error) {
    console.error('Post department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a department
router.put('/:id', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const { departmentCode, departmentName } = req.body;
    const departmentId = req.params.id;

    if (!departmentCode || !departmentName) {
      return res.status(400).json({ message: 'Department code and name are required' });
    }

    const existingDepartment = await Department.findOne({ departmentCode, _id: { $ne: departmentId } });
    if (existingDepartment) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    const department = await Department.findByIdAndUpdate(
      departmentId,
      { departmentCode, departmentName, updatedAt: Date.now() },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ message: 'Department updated successfully', department });
  } catch (error) {
    console.error('Put department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a department
router.delete('/:id', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const departmentId = req.params.id;
    const department = await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if req.user has _id
    if (!req.user || !req.user._id) {
      console.error('Invalid user data:', req.user);
      return res.status(403).json({ message: 'Invalid user data in token' });
    }

    // Log the deletion to deletedLogs
    const deletedLog = new DeletedLog({
      entityType: 'Department',
      entityDetails: {
        departmentCode: department.departmentCode,
        departmentName: department.departmentName,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      },
      deletedBy: {
        userId: req.user._id,
        name: req.user.name || 'Unknown',
        email: req.user.email || 'Unknown',
      },
      deletedAt: new Date(),
      reason: '', // No reason provided in UI
    });
    await deletedLog.save();

    // Delete the department
    await Department.findByIdAndDelete(departmentId);

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;