// const express = require('express');
// const router = express.Router();
// const Branch = require('../model/Branch');
// const jwt = require('jsonwebtoken');

// // Middleware to verify JWT
// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ message: 'Access token required' });
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).json({ message: 'Invalid or expired token' });
//     }
//     req.user = user;
//     next();
//   });
// };

// // Get all branches
// router.get('/', authenticateToken, async (req, res) => {
//   try {
//     const branches = await Branch.find().sort({ createdAt: -1 });
//     res.json(branches);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Add a new branch
// router.post('/', authenticateToken, async (req, res) => {
//   try {
//     const { branchCode, branchName } = req.body;

//     if (!branchCode || !branchName) {
//       return res.status(400).json({ message: 'Branch code and name are required' });
//     }

//     const existingBranch = await Branch.findOne({ branchCode });
//     if (existingBranch) {
//       return res.status(400).json({ message: 'Branch code already exists' });
//     }

//     const branch = new Branch({ branchCode, branchName });
//     await branch.save();

//     res.status(201).json({ message: 'Branch created successfully', branch });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Update a branch
// router.put('/:id', authenticateToken, async (req, res) => {
//   try {
//     const { branchCode, branchName } = req.body;
//     const branchId = req.params.id;

//     if (!branchCode || !branchName) {
//       return res.status(400).json({ message: 'Branch code and name are required' });
//     }

//     const existingBranch = await Branch.findOne({ branchCode, _id: { $ne: branchId } });
//     if (existingBranch) {
//       return res.status(400).json({ message: 'Branch code already exists' });
//     }

//     const branch = await Branch.findByIdAndUpdate(
//       branchId,
//       { branchCode, branchName, updatedAt: Date.now() },
//       { new: true }
//     );

//     if (!branch) {
//       return res.status(404).json({ message: 'Branch not found' });
//     }

//     res.json({ message: 'Branch updated successfully', branch });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Delete a branch
// router.delete('/:id', authenticateToken, async (req, res) => {
//   try {
//     const branchId = req.params.id;
//     const branch = await Branch.findByIdAndDelete(branchId);

//     if (!branch) {
//       return res.status(404).json({ message: 'Branch not found' });
//     }

//     res.json({ message: 'Branch deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const Branch = require('../model/Branch');
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

// Get all branches
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branches = await Branch.find().sort({ createdAt: -1 });
    res.json(branches);
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new branch
router.post('/', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const { branchCode, branchName } = req.body;

    if (!branchCode || !branchName) {
      return res.status(400).json({ message: 'Branch code and name are required' });
    }

    const existingBranch = await Branch.findOne({ branchCode });
    if (existingBranch) {
      return res.status(400).json({ message: 'Branch code already exists' });
    }

    const branch = new Branch({ branchCode, branchName });
    await branch.save();

    res.status(201).json({ message: 'Branch created successfully', branch });
  } catch (error) {
    console.error('Post branch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a branch
router.put('/:id', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const { branchCode, branchName } = req.body;
    const branchId = req.params.id;

    if (!branchCode || !branchName) {
      return res.status(400).json({ message: 'Branch code and name are required' });
    }

    const existingBranch = await Branch.findOne({ branchCode, _id: { $ne: branchId } });
    if (existingBranch) {
      return res.status(400).json({ message: 'Branch code already exists' });
    }

    const branch = await Branch.findByIdAndUpdate(
      branchId,
      { branchCode, branchName, updatedAt: Date.now() },
      { new: true }
    );

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    res.json({ message: 'Branch updated successfully', branch });
  } catch (error) {
    console.error('Put branch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a branch
router.delete('/:id', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const branchId = req.params.id;
    const branch = await Branch.findById(branchId);

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Check if req.user has _id
    if (!req.user || !req.user._id) {
      console.error('Invalid user data:', req.user);
      return res.status(403).json({ message: 'Invalid user data in token' });
    }

    // Log the deletion to deletedLogs
    const deletedLog = new DeletedLog({
      entityType: 'Branch',
      entityDetails: {
        branchCode: branch.branchCode,
        branchName: branch.branchName,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt,
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

    // Delete the branch
    await Branch.findByIdAndDelete(branchId);

    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;