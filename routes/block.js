const express = require('express');
const router = express.Router();
const Block = require('../model/Block');
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

// Get all blocks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const blocks = await Block.find().sort({ createdAt: -1 });
    res.json(blocks);
  } catch (error) {
    console.error('Get blocks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new block
router.post('/', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const { blockCode, blockName } = req.body;

    if (!blockCode || !blockName) {
      return res.status(400).json({ message: 'Block code and name are required' });
    }

    const existingBlock = await Block.findOne({ blockCode });
    if (existingBlock) {
      return res.status(400).json({ message: 'Block code already exists' });
    }

    const block = new Block({ blockCode, blockName });
    await block.save();

    res.status(201).json({ message: 'Block created successfully', block });
  } catch (error) {
    console.error('Post block error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a block
router.put('/:id', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const { blockCode, blockName } = req.body;
    const blockId = req.params.id;

    if (!blockCode || !blockName) {
      return res.status(400).json({ message: 'Block code and name are required' });
    }

    const existingBlock = await Block.findOne({ blockCode, _id: { $ne: blockId } });
    if (existingBlock) {
      return res.status(400).json({ message: 'Block code already exists' });
    }

    const block = await Block.findByIdAndUpdate(
      blockId,
      { blockCode, blockName, updatedAt: Date.now() },
      { new: true }
    );

    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }

    res.json({ message: 'Block updated successfully', block });
  } catch (error) {
    console.error('Put block error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a block
router.delete('/:id', authenticateToken, adminMiddleware, async (req, res) => {
  try {
    const blockId = req.params.id;
    const block = await Block.findById(blockId);

    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }

    // Check if req.user has _id
    if (!req.user || !req.user._id) {
      console.error('Invalid user data:', req.user);
      return res.status(403).json({ message: 'Invalid user data in token' });
    }

    // Log the deletion to deletedLogs
    const deletedLog = new DeletedLog({
      entityType: 'Block',
      entityDetails: {
        blockCode: block.blockCode,
        blockName: block.blockName,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
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

    // Delete the block
    await Block.findByIdAndDelete(blockId);

    res.json({ message: 'Block deleted successfully' });
  } catch (error) {
    console.error('Delete block error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;