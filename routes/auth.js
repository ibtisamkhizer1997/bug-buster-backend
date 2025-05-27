// /Auth.js

const express = require("express");
const router = express.Router();
const User = require("../model/User");
const Branch = require("../model/Branch");
const Department = require("../model/Department");
const Block = require("../model/Block");
const DeletedLog = require("../model/DeletedLogs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

const otpStore = new Map();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"BugBuster" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email - OTP",
    html: `
      <h3>Email Verification</h3>
      <p>Your OTP for email verification is: <strong>${otp}</strong></p>
      <p>This OTP is valid for 5 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// SuperAdmin middleware
const superAdminMiddleware = (req, res, next) => {
  if (!req.user || !req.user.roles || !req.user.roles.includes("SuperAdmin")) {
    return res.status(403).json({ message: "SuperAdmin access required" });
  }
  next();
};

router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      roles,
      phone,
      houseNo,
      block,
      branch,
      department,
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !roles ||
      !Array.isArray(roles) ||
      roles.length === 0
    ) {
      return res.status(400).json({
        message: "Name, email, password, and at least one role are required",
      });
    }

    const validRoles = ["EndUser", "ServiceProvider", "Admin"];
    if (!roles.every((role) => validRoles.includes(role))) {
      return res.status(400).json({ message: "Invalid role(s)" });
    }

    if (roles.includes("EndUser") && (!phone || !block)) {
      return res
        .status(400)
        .json({ message: "Phone and block are required for EndUser" });
    }
    if (roles.includes("EndUser") && (!houseNo || !block)) {
      return res
        .status(400)
        .json({ message: "House number and block are required for EndUser" });
    }

    if (roles.includes("ServiceProvider") && (!branch || !department)) {
      return res.status(400).json({
        message: "Branch and department are required for Service Provider",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const otp = generateOTP();
    const storedData = otpStore.get(email);
    const resendAttempts = storedData
      ? (storedData.resendAttempts || 0) + 1
      : 0;

    if (resendAttempts >= 4) {
      otpStore.delete(email);
      return res
        .status(400)
        .json({ message: "Resend limit reached. Please try again later." });
    }

    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, {
      otp,
      expiresAt,
      signupData: req.body,
      resendAttempts,
    });

    await sendOTPEmail(email, otp);

    res.status(200).json({
      message: "OTP sent to your email. Please verify to complete signup.",
      email,
      resendAttempts,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
    においては;
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired" });
    }

    const { name, password, roles, phone, houseNo, block, branch, department } =
      storedData.signupData;

    const userData = {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      roles,
      phone,
      houseNo: houseNo || undefined,
      block: block || undefined,
      branch: branch || undefined,
      department: department || undefined,
    };

    const user = new User(userData);
    await user.save();

    otpStore.delete(email);

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// resend OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res
        .status(400)
        .json({ message: "No pending signup found for this email" });
    }

    const resendAttempts = (storedData.resendAttempts || 0) + 1;
    if (resendAttempts >= 4) {
      otpStore.delete(email);
      return res
        .status(400)
        .json({ message: "Resend limit reached. Please try again later." });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, {
      ...storedData,
      otp,
      expiresAt,
      resendAttempts,
    });

    await sendOTPEmail(email, otp);

    res.status(200).json({
      message: "OTP resent to your email. Please verify to complete signup.",
      email,
      resendAttempts,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/dropdowns", async (req, res) => {
  try {
    const branches = await Branch.find().select("_id branchName branchCode");
    const departments = await Department.find().select(
      "_id departmentName departmentCode"
    );
    const blocks = await Block.find().select("_id blockName blockCode");
    res.json({ branches, departments, blocks });
  } catch (error) {
    console.error("Dropdowns error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users with populated block, branch, and department
router.get("/users", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("block", "blockName blockCode")
      .populate("branch", "branchName branchCode")
      .populate("department", "departmentName departmentCode")
      .lean();

    res.status(200).json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all deleted logs
router.get(
  "/deleted-logs",
  authMiddleware,
  superAdminMiddleware,
  async (req, res) => {
    try {
      const deletedLogs = await DeletedLog.find()
        .sort({ deletedAt: -1 })
        .lean();

      res.status(200).json(deletedLogs);
    } catch (error) {
      console.error("Fetch deleted logs error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update a user
router.put(
  "/users/:id",
  authMiddleware,
  superAdminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, roles, phone, houseNo, block, branch, department } =
        req.body;

      if (
        !name ||
        !email ||
        !roles ||
        !Array.isArray(roles) ||
        roles.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Name, email, and at least one role are required" });
      }

      const validRoles = ["EndUser", "ServiceProvider", "Admin"];
      if (!roles.every((role) => validRoles.includes(role))) {
        return res.status(400).json({ message: "Invalid role(s)" });
      }
      if (
        (roles.includes("EndUser") || roles.includes("ServiceProvider")) &&
        !phone
      ) {
        return res
          .status(400)
          .json({
            message: "Phone is required for EndUser or ServiceProvider",
          });
      }

      if (roles.includes("EndUser") && (!houseNo || !block)) {
        return res
          .status(400)
          .json({ message: "House number and block are required for EndUser" });
      }
      if (roles.includes("ServiceProvider") && (!branch || !department)) {
        return res.status(400).json({
          message: "Branch and department are required for Service Provider",
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.name = name;
      user.email = email;
      user.roles = roles;
      user.phone = phone || undefined;
      user.houseNo = houseNo || undefined;
      user.block = block || undefined;
      user.branch = branch || undefined;
      user.department = department || undefined;

      await user.save();

      const updatedUser = await User.findById(id)
        .select("-password")
        .populate("block", "blockName blockCode")
        .populate("branch", "branchName branchCode")
        .populate("department", "departmentName departmentCode")
        .lean();

      res.status(200).json({ user: updatedUser });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete a user
router.delete(
  "/users/:id",
  authMiddleware,
  superAdminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id).populate("block branch department");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the deletion to deletedLogs
      const deletedLog = new DeletedLog({
        entityType: "User",
        entityDetails: {
          name: user.name,
          email: user.email,
          roles: user.roles,
          phone: user.phone,
          houseNo: user.houseNo,
          password: user.password,
          block: user.block
            ? {
                _id: user.block._id,
                blockCode: user.block.blockCode,
                blockName: user.block.blockName,
              }
            : null,
          branch: user.branch
            ? {
                _id: user.branch._id,
                branchCode: user.branch.branchCode,
                branchName: user.branch.branchName,
              }
            : null,
          department: user.department
            ? {
                _id: user.department._id,
                departmentCode: user.department.departmentCode,
                departmentName: user.department.departmentName,
              }
            : null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        deletedBy: {
          userId: req.user._id,
          name: req.user.name || "Unknown",
          email: req.user.email || "Unknown",
        },
        deletedAt: new Date(),
        reason: "", // No reason provided in UI
      });
      await deletedLog.save();

      await user.deleteOne();
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
