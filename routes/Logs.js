// const express = require('express');
// const router = express.Router();
// const DeletedLog = require('../model/DeletedLogs');
// const Branch = require('../model/Branch');
// const User = require('../model/User');
// const Issue = require('../model/Issue');
// const Department = require('../model/Department');
// const Block = require('../model/Block');
// const jwt = require('jsonwebtoken');

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

// // Middleware to check superadmin role
// const superAdminMiddleware = (req, res, next) => {
//   if (!req.user || !req.user.roles || !req.user.roles.includes('SuperAdmin')) {
//     return res.status(403).json({ message: 'SuperAdmin access required' });
//   }
//   next();
// };

// // Middleware to check admin role (commented out as in original)
// const adminMiddleware = (req, res, next) => {
//   if (!req.user || !req.user.role || req.user.role !== 'Admin') {
//     return res.status(403).json({ message: 'Admin access required' });
//   }
//   next();
// };

// // Get all deleted logs
// router.get('/deleted', authenticateToken, superAdminMiddleware, async (req, res) => {
//   try {
//     const logs = await DeletedLog.find().sort({ deletedAt: -1 });
//     res.json(logs);
//   } catch (error) {
//     console.error('Fetch logs error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Restore a deleted item
// // router.post('/restore/:id', authenticateToken, superAdminMiddleware, async (req, res) => {
// //   try {
// //     const logId = req.params.id;
// //     const log = await DeletedLog.findById(logId);
// //     if (!log) {
// //       return res.status(404).json({ message: 'Log not found' });
// //     }

// //     const { entityType, entityDetails } = log;
// //     let restoredItem;

// //     switch (entityType) {
// //       case 'Branch':
// //         const existingBranch = await Branch.findOne({ branchCode: entityDetails.branchCode });
// //         if (existingBranch) {
// //           return res.status(400).json({ message: 'Branch code already exists' });
// //         }
// //         restoredItem = new Branch({
// //           branchCode: entityDetails.branchCode,
// //           branchName: entityDetails.branchName,
// //           createdAt: entityDetails.createdAt,
// //           updatedAt: entityDetails.updatedAt,
// //         });
// //         await restoredItem.save();
// //         break;

// //       case 'User':
// //         const existingUser = await User.findOne({ email: entityDetails.email });
// //         if (existingUser) {
// //           return res.status(400).json({ message: 'User email already exists' });
// //         }
// //         restoredItem = new User({
// //           name: entityDetails.name,
// //           email: entityDetails.email,
// //           password: entityDetails.password,
// //           roles: entityDetails.roles,
// //           phone: entityDetails.phone,
// //           block: entityDetails.block?._id,
// //           branch: entityDetails.branch?._id,
// //           department: entityDetails.department?._id,
// //           createdAt: entityDetails.createdAt,
// //           updatedAt: entityDetails.updatedAt,
// //         });
// //         await restoredItem.save();
// //         break;

// //       case 'Issue':
// //         const existingIssue = await Issue.findOne({
// //           userName: entityDetails.userName,
// //           branch: entityDetails.branch?._id,
// //           department: entityDetails.department?._id,
// //         });
// //         if (existingIssue) {
// //           return res.status(400).json({ message: 'Issue with same userName, branch, and department already exists' });
// //         }
// //         restoredItem = new Issue({
// //           userName: entityDetails.userName,
// //           branch: entityDetails.branch?._id,
// //           department: entityDetails.department?._id,
// //           assignedTo: entityDetails.assignedTo?._id,
// //           description: entityDetails.description,
// //           status: entityDetails.status,
// //           priority: entityDetails.priority,
// //           attachment: entityDetails.attachment,
// //           rating: entityDetails.rating,
// //           createdBy: req.user.userId, // Use current user as creator
// //           createdAt: entityDetails.createdAt,
// //           updatedAt: entityDetails.updatedAt,
// //         });
// //         await restoredItem.save();
// //         break;

// //       case 'Department':
// //         const existingDepartment = await Department.findOne({ departmentCode: entityDetails.departmentCode });
// //         if (existingDepartment) {
// //           return res.status(400).json({ message: 'Department code already exists' });
// //         }
// //         restoredItem = new Department({
// //           departmentCode: entityDetails.departmentCode,
// //           departmentName: entityDetails.departmentName,
// //           createdAt: entityDetails.createdAt,
// //           updatedAt: entityDetails.updatedAt,
// //         });
// //         await restoredItem.save();
// //         break;

// //       case 'Block':
// //         const existingBlock = await Block.findOne({ blockCode: entityDetails.blockCode });
// //         if (existingBlock) {
// //           return res.status(400).json({ message: 'Block code already exists' });
// //         }
// //         restoredItem = new Block({
// //           blockCode: entityDetails.blockCode,
// //           blockName: entityDetails.blockName,
// //           createdAt: entityDetails.createdAt,
// //           updatedAt: entityDetails.updatedAt,
// //         });
// //         await restoredItem.save();
// //         break;

// //       default:
// //         return res.status(400).json({ message: 'Unsupported entity type' });
// //     }

// //     await DeletedLog.findByIdAndDelete(logId);
// //     res.json({ message: `${entityType} restored successfully`, restoredItem });
// //   } catch (error) {
// //     console.error('Restore error:', error);
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // });

// router.post('/restore/:id', authenticateToken, superAdminMiddleware, async (req, res) => {
//   try {
//     const logId = req.params.id;
//     const log = await DeletedLog.findById(logId);
//     if (!log) {
//       return res.status(404).json({ message: 'Log not found' });
//     }

//     const { entityType, entityDetails } = log;
//     let restoredItem;

//     switch (entityType) {
//       case 'Branch':
//         const existingBranch = await Branch.findOne({ branchCode: entityDetails.branchCode });
//         if (existingBranch) {
//           return res.status(400).json({ message: 'Branch code already exists' });
//         }
//         restoredItem = new Branch({
//           branchCode: entityDetails.branchCode,
//           branchName: entityDetails.branchName,
//           createdAt: entityDetails.createdAt,
//           updatedAt: entityDetails.updatedAt,
//         });
//         await restoredItem.save();
//         break;

//       case 'User':
//         const existingUser = await User.findOne({ email: entityDetails.email });
//         if (existingUser) {
//           return res.status(400).json({ message: 'User email already exists' });
//         }
//         restoredItem = new User({
//           name: entityDetails.name,
//           email: entityDetails.email,
//           password: entityDetails.password,
//           roles: entityDetails.roles,
//           phone: entityDetails.phone,
//           block: entityDetails.block?._id,
//           branch: entityDetails.branch?._id,
//           department: entityDetails.department?._id,
//           createdAt: entityDetails.createdAt,
//           updatedAt: entityDetails.updatedAt,
//         });
//         await restoredItem.save();
//         break;

//       case 'Issue':
//         // No need to check for existing issue since _id is unique in MongoDB
//         // Optionally, verify that the _id doesn't already exist (though unlikely)
//         const existingIssue = await Issue.findById(entityDetails._id);
//         if (existingIssue) {
//           console.log('Issue with _id already exists:', entityDetails._id);
//           return res.status(400).json({ message: 'Issue with this ID already exists' });
//         }
//         console.log('Restoring issue with details:', entityDetails);
//         restoredItem = new Issue({
//           _id: entityDetails._id, // Restore with original _id
//           userName: entityDetails.userName,
//           branch: entityDetails.branch?._id,
//           department: entityDetails.department?._id,
//           assignedTo: entityDetails.assignedTo?._id,
//           description: entityDetails.description,
//           status: entityDetails.status,
//           priority: entityDetails.priority,
//           attachment: entityDetails.attachment,
//           rating: entityDetails.rating,
//           feedback: entityDetails.feedback,
//           createdBy: entityDetails.createdBy?._id || req.user.userId, // Use original createdBy if available, else current user
//           createdAt: entityDetails.createdAt,
//           updatedAt: entityDetails.updatedAt,
//         });
//         await restoredItem.save();
//         console.log('Issue restored:', restoredItem._id);
//         break;

//       case 'Department':
//         const existingDepartment = await Department.findOne({ departmentCode: entityDetails.departmentCode });
//         if (existingDepartment) {
//           return res.status(400).json({ message: 'Department code already exists' });
//         }
//         restoredItem = new Department({
//           departmentCode: entityDetails.departmentCode,
//           departmentName: entityDetails.departmentName,
//           createdAt: entityDetails.createdAt,
//           updatedAt: entityDetails.updatedAt,
//         });
//         await restoredItem.save();
//         break;

//       case 'Block':
//         const existingBlock = await Block.findOne({ blockCode: entityDetails.blockCode });
//         if (existingBlock) {
//           return res.status(400).json({ message: 'Block code already exists' });
//         }
//         restoredItem = new Block({
//           blockCode: entityDetails.blockCode,
//           blockName: entityDetails.blockName,
//           createdAt: entityDetails.createdAt,
//           updatedAt: entityDetails.updatedAt,
//         });
//         await restoredItem.save();
//         break;

//       default:
//         return res.status(400).json({ message: 'Unsupported entity type' });
//     }

//     await DeletedLog.findByIdAndDelete(logId);
//     console.log(`Deleted log ${logId} after restoring ${entityType}`);
//     res.json({ message: `${entityType} restored successfully`, restoredItem });
//   } catch (error) {
//     console.error('Restore error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const DeletedLog = require('../model/DeletedLogs');
const Branch = require('../model/Branch');
const User = require('../model/User');
const Issue = require('../model/Issue');
const Department = require('../model/Department');
const Block = require('../model/Block');
const ActivityLog = require('../model/ActivityLog');
const jwt = require('jsonwebtoken');

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

// Middleware to check superadmin role
const superAdminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.roles || !req.user.roles.includes('SuperAdmin')) {
    return res.status(403).json({ message: 'SuperAdmin access required' });
  }
  next();
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

// Get all deleted logs
router.get('/deleted', authenticateToken, superAdminMiddleware, async (req, res) => {
  try {
    const logs = await DeletedLog.find().sort({ deletedAt: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Fetch logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Restore a deleted item
router.post('/restore/:id', authenticateToken, superAdminMiddleware, async (req, res) => {
  try {
    const logId = req.params.id;
    const log = await DeletedLog.findById(logId);
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }

    const { entityType, entityDetails } = log;
    let restoredItem;

    switch (entityType) {
      case 'Branch':
        const existingBranch = await Branch.findOne({ branchCode: entityDetails.branchCode });
        if (existingBranch) {
          return res.status(400).json({ message: 'Branch code already exists' });
        }
        restoredItem = new Branch({
          branchCode: entityDetails.branchCode,
          branchName: entityDetails.branchName,
          createdAt: entityDetails.createdAt,
          updatedAt: entityDetails.updatedAt,
        });
        await restoredItem.save();
        break;

      case 'User':
        const existingUser = await User.findOne({ email: entityDetails.email });
        if (existingUser) {
          return res.status(400).json({ message: 'User email already exists' });
        }
        restoredItem = new User({
          name: entityDetails.name,
          email: entityDetails.email,
          password: entityDetails.password,
          roles: entityDetails.roles,
          phone: entityDetails.phone,
          block: entityDetails.block?._id,
          branch: entityDetails.branch?._id,
          department: entityDetails.department?._id,
          createdAt: entityDetails.createdAt,
          updatedAt: entityDetails.updatedAt,
        });
        await restoredItem.save();
        break;

      case 'Issue':
        const existingIssue = await Issue.findById(entityDetails._id);
        if (existingIssue) {
          console.log('Issue with _id already exists:', entityDetails._id);
          return res.status(400).json({ message: 'Issue with this ID already exists' });
        }
        console.log('Restoring issue with details:', entityDetails);
        restoredItem = new Issue({
          _id: entityDetails._id,
          userName: entityDetails.userName,
          branch: entityDetails.branch?._id,
          department: entityDetails.department?._id,
          assignedTo: entityDetails.assignedTo?._id,
          description: entityDetails.description,
          status: entityDetails.status,
          priority: entityDetails.priority,
          attachment: entityDetails.attachment,
          rating: entityDetails.rating,
          feedback: entityDetails.feedback,
          createdBy: entityDetails.createdBy?._id || req.user.userId,
          createdAt: entityDetails.createdAt,
          updatedAt: entityDetails.updatedAt,
        });
        await restoredItem.save();
        console.log('Issue restored:', restoredItem._id);

        // Log activity for issue restoration
        const user = await User.findById(req.user.userId);
        const populatedIssue = await Issue.findById(restoredItem._id)
          .populate('assignedTo', 'name email _id')
          .populate('createdBy', 'name email _id');
        await createActivityLog(
          'restore',
          populatedIssue,
          user,
          `Issue ${restoredItem._id} restored by SuperAdmin ${user.name}`,
          { entityType, entityDetails }
        );
        break;

      case 'Department':
        const existingDepartment = await Department.findOne({ departmentCode: entityDetails.departmentCode });
        if (existingDepartment) {
          return res.status(400).json({ message: 'Department code already exists' });
        }
        restoredItem = new Department({
          departmentCode: entityDetails.departmentCode,
          departmentName: entityDetails.departmentName,
          createdAt: entityDetails.createdAt,
          updatedAt: entityDetails.updatedAt,
        });
        await restoredItem.save();
        break;

      case 'Block':
        const existingBlock = await Block.findOne({ blockCode: entityDetails.blockCode });
        if (existingBlock) {
          return res.status(400).json({ message: 'Block code already exists' });
        }
        restoredItem = new Block({
          blockCode: entityDetails.blockCode,
          blockName: entityDetails.blockName,
          createdAt: entityDetails.createdAt,
          updatedAt: entityDetails.updatedAt,
        });
        await restoredItem.save();
        break;

      default:
        return res.status(400).json({ message: 'Unsupported entity type' });
    }

    await DeletedLog.findByIdAndDelete(logId);
    console.log(`Deleted log ${logId} after restoring ${entityType}`);
    res.json({ message: `${entityType} restored successfully`, restoredItem });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;