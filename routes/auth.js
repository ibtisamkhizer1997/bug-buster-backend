// const express = require("express");
// const router = express.Router();
// const User = require("../model/User");
// const Branch = require("../model/Branch");
// const Department = require("../model/Department");
// const Block = require("../model/Block");
// const DeletedLog = require("../model/DeletedLogs");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");
// require("dotenv").config();

// const otpStore = new Map();

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: process.env.EMAIL_PORT,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// const generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// const sendOTPEmail = async (email, otp) => {
//   const mailOptions = {
//     from: `"BugBuster" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: "Verify Your Email - OTP",
//     html: `
//       <h3>Email Verification</h3>
//       <p>Your OTP for email verification is: <strong>${otp}</strong></p>
//       <p>This OTP is valid for 5 minutes.</p>
//       <p>If you did not request this, please ignore this email.</p>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };

// // Authentication middleware
// const authMiddleware = (req, res, next) => {
//   const token = req.header("Authorization")?.replace("Bearer ", "");
//   if (!token) {
//     return res.status(401).json({ message: "No token, authorization denied" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (error) {
//     res.status(401).json({ message: "Token is not valid" });
//   }
// };

// // SuperAdmin middleware
// const superAdminMiddleware = (req, res, next) => {
//   if (!req.user || !req.user.roles || !req.user.roles.includes('SuperAdmin')) {
//     return res.status(403).json({ message: 'SuperAdmin access required' });
//   }
//   next();
// };

// router.post("/signup", async (req, res) => {
//   try {
//     const { name, email, password, roles, phone, houseNo, block, branch, department } =
//       req.body;

//     if (
//       !name ||
//       !email ||
//       !password ||
//       !roles ||
//       !Array.isArray(roles) ||
//       roles.length === 0
//     ) {
//       return res.status(400).json({
//         message: "Name, email, password, and at least one role are required",
//       });
//     }

//     // Only SuperAdmin can assign SuperAdmin role; this will be handled in /users/:id for updates
//     const validRoles = ["EndUser", "ServiceProvider", "Admin"];
//     if (!roles.every((role) => validRoles.includes(role))) {
//       return res.status(400).json({ message: "Invalid role(s). SuperAdmin role can only be assigned by a SuperAdmin." });
//     }

//     if (roles.includes("EndUser") && (!phone || !block || !houseNo)) {
//       return res
//         .status(400)
//         .json({ message: "Phone, house number, and block are required for EndUser" });
//     }

//     if (roles.includes("ServiceProvider") && (!branch || !department)) {
//       return res.status(400).json({
//         message: "Branch and department are required for Service Provider",
//       });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email already exists" });
//     }

//     const otp = generateOTP();
//     const storedData = otpStore.get(email);
//     const resendAttempts = storedData
//       ? (storedData.resendAttempts || 0) + 1
//       : 0;

//     if (resendAttempts >= 4) {
//       otpStore.delete(email);
//       return res
//         .status(400)
//         .json({ message: "Resend limit reached. Please try again later." });
//     }

//     const expiresAt = Date.now() + 5 * 60 * 1000;
//     otpStore.set(email, {
//       otp,
//       expiresAt,
//       signupData: req.body,
//       resendAttempts,
//     });

//     await sendOTPEmail(email, otp);

//     res.status(200).json({
//       message: "OTP sent to your email. Please verify to complete signup.",
//       email,
//       resendAttempts,
//     });
//   } catch (error) {
//     console.error("Signup error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// router.post("/verify-otp", async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     if (!email || !otp) {
//       return res.status(400).json({ message: "Email and OTP are required" });
//     }

//     const storedData = otpStore.get(email);
//     if (!storedData) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     if (storedData.otp !== otp) {
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     if (Date.now() > storedData.expiresAt) {
//       otpStore.delete(email);
//       return res.status(400).json({ message: "OTP has expired" });
//     }

//     const { name, password, roles, phone, houseNo, block, branch, department } =
//       storedData.signupData;

//     const userData = {
//       name,
//       email,
//       password: await bcrypt.hash(password, 10),
//       roles,
//       phone,
//       houseNo: houseNo || undefined,
//       block: block || undefined,
//       branch: branch || undefined,
//       department: department || undefined,
//     };

//     const user = new User(userData);
//     await user.save();

//     otpStore.delete(email);

//     res.status(201).json({ message: "User created successfully" });
//   } catch (error) {
//     console.error("OTP verification error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Resend OTP
// router.post("/resend-otp", async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: "Email is required" });
//     }

//     const storedData = otpStore.get(email);
//     if (!storedData) {
//       return res.status(400).json({ message: "No pending signup found for this email" });
//     }

//     const resendAttempts = (storedData.resendAttempts || 0) + 1;
//     if (resendAttempts >= 4) {
//       otpStore.delete(email);
//       return res.status(400).json({ message: "Resend limit reached. Please try again later." });
//     }

//     const otp = generateOTP();
//     const expiresAt = Date.now() + 5 * 60 * 1000;
//     otpStore.set(email, {
//       ...storedData,
//       otp,
//       expiresAt,
//       resendAttempts,
//     });

//     await sendOTPEmail(email, otp);

//     res.status(200).json({
//       message: "OTP resent to your email. Please verify to complete signup.",
//       email,
//       resendAttempts,
//     });
//   } catch (error) {
//     console.error("Resend OTP error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) {
//       return res
//         .status(400)
//         .json({ message: "Email and password are required" });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       {
//         userId: user._id,
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         roles: user.roles,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );

//     res.json({
//       token,
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//         roles: user.roles,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// router.get("/dropdowns", async (req, res) => {
//   try {
//     const branches = await Branch.find().select("_id branchName branchCode");
//     const departments = await Department.find().select(
//       "_id departmentName departmentCode"
//     );
//     const blocks = await Block.find().select("_id blockName blockCode");
//     res.json({ branches, departments, blocks });
//   } catch (error) {
//     console.error("Dropdowns error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get all users with populated block, branch, and department
// router.get("/users", authMiddleware, superAdminMiddleware, async (req, res) => {
//   try {
//     const users = await User.find()
//       .select("-password")
//       .populate("block", "blockName blockCode")
//       .populate("branch", "branchName branchCode")
//       .populate("department", "departmentName departmentCode")
//       .lean();

//     res.status(200).json(users);
//   } catch (error) {
//     console.error("Fetch users error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get all deleted logs
// router.get("/deleted-logs", authMiddleware, superAdminMiddleware, async (req, res) => {
//   try {
//     const deletedLogs = await DeletedLog.find()
//       .sort({ deletedAt: -1 })
//       .lean();

//     res.status(200).json(deletedLogs);
//   } catch (error) {
//     console.error("Fetch deleted logs error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Update a user
// router.put("/users/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, email, roles, phone, houseNo, block, branch, department } = req.body;

//     if (
//       !name ||
//       !email ||
//       !roles ||
//       !Array.isArray(roles) ||
//       roles.length === 0
//     ) {
//       return res
//         .status(400)
//         .json({ message: "Name, email, and at least one role are required" });
//     }

//     const validRoles = ["EndUser", "ServiceProvider", "Admin", "SuperAdmin"];
//     if (!roles.every((role) => validRoles.includes(role))) {
//       return res.status(400).json({ message: "Invalid role(s)" });
//     }
//     if ((roles.includes("EndUser") || roles.includes("ServiceProvider")) && !phone) {
//       return res.status(400).json({ message: "Phone is required for EndUser or ServiceProvider" });
//     }

//     if (roles.includes("EndUser") && (!houseNo || !block)) {
//       return res.status(400).json({ message: "House number and block are required for EndUser" });
//     }
//     if (roles.includes("ServiceProvider") && (!branch || !department)) {
//       return res.status(400).json({
//         message: "Branch and department are required for Service Provider",
//       });
//     }

//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if removing SuperAdmin role from self
//     if (user._id.toString() === req.user.userId && user.roles.includes("SuperAdmin") && !roles.includes("SuperAdmin")) {
//       return res.status(403).json({ message: "Cannot remove SuperAdmin role from yourself" });
//     }

//     user.name = name;
//     user.email = email;
//     user.roles = roles;
//     user.phone = phone || undefined;
//     user.houseNo = houseNo || undefined;
//     user.block = block || undefined;
//     user.branch = branch || undefined;
//     user.department = department || undefined;

//     await user.save();

//     const updatedUser = await User.findById(id)
//       .select("-password")
//       .populate("block", "blockName blockCode")
//       .populate("branch", "branchName branchCode")
//       .populate("department", "departmentName departmentCode")
//       .lean();

//     res.status(200).json({ user: updatedUser });
//   } catch (error) {
//     console.error("Update user error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Delete a user
// router.delete("/users/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const user = await User.findById(id).populate("block branch department");
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Prevent SuperAdmin from deleting themselves
//     if (user._id.toString() === req.user.userId) {
//       return res.status(403).json({ message: "Cannot delete your own account" });
//     }

//     // Log the deletion to deletedLogs
//     const deletedLog = new DeletedLog({
//       entityType: "User",
//       entityDetails: {
//         name: user.name,
//         email: user.email,
//         roles: user.roles,
//         phone: user.phone,
//         houseNo: user.houseNo,
//         password: user.password,
//         block: user.block
//           ? {
//               _id: user.block._id,
//               blockCode: user.block.blockCode,
//               blockName: user.block.blockName,
//             }
//           : null,
//         branch: user.branch
//           ? {
//               _id: user.branch._id,
//               branchCode: user.branch.branchCode,
//               branchName: user.branch.branchName,
//             }
//           : null,
//         department: user.department
//           ? {
//               _id: user.department._id,
//               departmentCode: user.department.departmentCode,
//               departmentName: user.department.departmentName,
//             }
//           : null,
//         createdAt: user.createdAt,
//         updatedAt: user.updatedAt,
//       },
//       deletedBy: {
//         userId: req.user._id,
//         name: req.user.name || "Unknown",
//         email: req.user.email || "Unknown",
//       },
//       deletedAt: new Date(),
//       reason: "", // No reason provided in UI
//     });
//     await deletedLog.save();

//     await user.deleteOne();
//     res.status(200).json({ message: "User deleted successfully" });
//   } catch (error) {
//     console.error("Delete user error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// module.exports = router;

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
const { default: mongoose } = require("mongoose");
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

const sendOTPEmail = async (email, otp, subject, purpose) => {
  const mailOptions = {
    from: `"BugBuster" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject || "Verify Your Email - OTP",
    html: `
      <h3>${purpose || 'Email Verification'}</h3>
      <p>Your OTP is: <strong>${otp}</strong></p>
      <p>This OTP is valid for 40 seconds.</p>
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
  if (!req.user || !req.user.roles || !req.user.roles.includes('SuperAdmin')) {
    return res.status(403).json({ message: 'SuperAdmin access required' });
  }
  next();
};

router.post("/signup", async (req, res) => {
  try {
    // Log the raw request body for debugging
    console.log('Raw signup request body:', req.body);

    // Handle potential field name variations for houseNo
    // const { name, email, password, company, roles, phone, houseNo, houseNumber, block, branch, department } = req.body;
    const { name, email, password, roles, phone, branch, department } = req.body;
    // const effectiveHouseNo = houseNo || houseNumber; // Fallback to houseNumber if houseNo is not provided

    // Log the extracted fields for debugging
    console.log('Extracted fields:', {
      name,
      email,
      password,
      // company,
      roles,
      phone,
      // houseNo,
      // houseNumber,
      // effectiveHouseNo,
      // block,
      branch,
      department,
    });

    // Validate required fields for all users
    // if (!name || !email || !password || !company || !roles || !Array.isArray(roles) || roles.length === 0) {
    //   return res.status(400).json({
    //     message: "Name, email, password, and at least one role is required",
    //   });
    // }
    if (!name || !email || !password || !roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({
        message: "Name, email, password, and at least one role is required",
      });
    }

    // Trim string inputs to handle whitespace issues
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    // const trimmedCompany = company.trim();
    const trimmedPhone = phone ? phone.trim() : '';
    // const trimmedHouseNo = effectiveHouseNo ? effectiveHouseNo.trim() : '';
    // const trimmedBlock = block ? block.trim() : '';
    const trimmedBranch = branch ? branch.trim() : '';
    const trimmedDepartment = department ? department.trim() : '';

    // Validate roles
    const validRoles = ["EndUser", "ServiceProvider", "Admin"];
    if (!roles.every((role) => validRoles.includes(role))) {
      return res.status(400).json({
        message: "Invalid role(s). SuperAdmin role can only be assigned by a SuperAdmin.",
      });
    }

    // Validate EndUser-specific fields
    if (roles.includes("EndUser")) {
      const missingFields = [];
      if (!trimmedPhone) missingFields.push("phone");
      // if (!trimmedHouseNo) missingFields.push("house number");
      // if (!trimmedBlock) missingFields.push("block");

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `The following fields are required for EndUser: ${missingFields.join(", ")}`,
        });
      }
    }

    // Validate ServiceProvider-specific fields
    if (roles.includes("ServiceProvider")) {
      const missingFields = [];
      if (!trimmedBranch) missingFields.push("branch");
      if (!trimmedDepartment) missingFields.push("department");

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `The following fields are required for ServiceProvider: ${missingFields.join(", ")}`,
        });
      }

      // Validate branch and department IDs if they are ObjectIds
      if (trimmedBranch && !mongoose.isValidObjectId(trimmedBranch)) {
        return res.status(400).json({ message: "Invalid branch ID" });
      }
      if (trimmedDepartment && !mongoose.isValidObjectId(trimmedDepartment)) {
        return res.status(400).json({ message: "Invalid department ID" });
      }
    }

    // Check for existing user
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Check if there's an existing OTP entry for this email
    const storedData = otpStore.get(trimmedEmail);

    // Check if email is locked out
    if (storedData && storedData.lockoutUntil && Date.now() < storedData.lockoutUntil) {
      const remainingSeconds = (storedData.lockoutUntil - Date.now()) / 1000;
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      console.log(`Email ${trimmedEmail} is locked out. Remaining: ${remainingMinutes} minutes.`);
      return res.status(429).json({
        message: `Too many attempts. Please wait ${remainingMinutes} minutes before trying again.`,
        remainingMinutes,
      });
    }

    // Calculate resend attempts
    const resendAttempts = storedData ? (storedData.resendAttempts || 0) + 1 : 0;

    // Check if resend limit is reached
    if (resendAttempts >= 4) {
      const lockoutDuration = 60 * 60 * 1000; // 1 hour
      const lockoutUntil = Date.now() + lockoutDuration;
      otpStore.set(trimmedEmail, {
        ...storedData,
        lockoutUntil,
        resendAttempts,
      });
      console.log(`Resend limit reached for ${trimmedEmail}. Locked out until ${new Date(lockoutUntil).toISOString()}.`);
      return res.status(429).json({
        message: "Resend limit reached. Please try again after 1 hour.",
        remainingMinutes: 60,
      });
    }

    // Generate and store OTP with 40-second expiration
    const otp = generateOTP();
    const expiresAt = Date.now() + 40 * 1000; // 40 seconds

    // Update or set OTP store entry
    otpStore.set(trimmedEmail, {
      otp,
      expiresAt,
      signupData: {
        name: trimmedName,
        email: trimmedEmail,
        // company:trimmedCompany,
        password,
        roles,
        phone: trimmedPhone,
        // houseNo: trimmedHouseNo,
        // block: trimmedBlock,
        branch: trimmedBranch,
        department: trimmedDepartment,
      },
      resendAttempts,
      purpose: "signup",
      lastResendAt: Date.now(), // Track last resend time
      lockoutUntil: null, // Reset lockout on new valid attempt
    });

    // Send OTP email
    await sendOTPEmail(trimmedEmail, otp, "Verify Your Email - OTP", "Email Verification");

    res.status(200).json({
      message: "OTP sent to your email. Please verify to complete signup.",
      email: trimmedEmail,
      // company : trimmedCompany,
      resendAttempts,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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

    if (storedData.purpose === "signup") {
      // const { name, password, roles, phone, houseNo, company, block, branch, department } =
      //   storedData.signupData;
      const { name, password, roles, phone, branch, department } =
        storedData.signupData;

      console.log(storedData.signupData);


      const userData = {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        // company,
        roles,
        phone,
        // houseNo: houseNo || undefined,
        // block: block || undefined,
        branch: branch || undefined,
        department: department || undefined,
      };

      const user = new User(userData);
      await user.save();
    }

    otpStore.delete(email);

    res.status(201).json({ message: storedData.purpose === "signup" ? "User created successfully" : "OTP verified successfully" });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const startTime = Date.now();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const storedData = otpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: "No pending signup or password reset found for this email" });
    }

    // Check if email is locked out
    const lockoutUntil = storedData.lockoutUntil || null;
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = (lockoutUntil - Date.now()) / 1000;
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      console.log(
        `Email ${email} is locked out. Remaining: ${remainingMinutes} minutes.`
      );
      return res.status(429).json({
        message: `Too many attempts. Please wait ${remainingMinutes} minutes before trying again.`,
        remainingMinutes,
      });
    }

    // Check if 40 seconds have passed since last resend
    const lastResendAt = storedData.lastResendAt || storedData.expiresAt - 40 * 1000;
    const timeSinceLastResend = Date.now() - lastResendAt;
    const resendDelay = 40 * 1000; // 40 seconds
    if (timeSinceLastResend < resendDelay) {
      const remainingSeconds = Math.ceil((resendDelay - timeSinceLastResend) / 1000);
      console.log(`Resend attempted too soon for ${email}. Wait ${remainingSeconds} seconds.`);
      return res.status(429).json({
        message: `Please wait ${remainingSeconds} seconds before resending OTP.`,
        remainingSeconds,
      });
    }

    // Check resend attempts limit (allow 4 resends, total 5 attempts)
    const resendAttempts = (storedData.resendAttempts || 0) + 1;
    if (resendAttempts >= 5) {
      const lockoutDuration = 60 * 60 * 1000; // 1 hour
      const newLockoutUntil = Date.now() + lockoutDuration;
      otpStore.set(email, {
        ...storedData,
        lockoutUntil: newLockoutUntil,
        resendAttempts,
      });
      console.log(`Resend limit reached for ${email}. Locked out until ${new Date(newLockoutUntil).toISOString()}.`);
      return res.status(429).json({
        message: "Too many attempts. Please wait 60 minutes before trying again.",
        remainingMinutes: 60,
      });
    }

    // Generate new OTP
    const otpStart = Date.now();
    const otp = generateOTP();
    console.log(`OTP generation took ${Date.now() - otpStart}ms`);

    // Update store with 40-second expiration
    const storeStart = Date.now();
    const expiresAt = Date.now() + 40 * 1000; // 40 seconds
    otpStore.set(email, {
      ...storedData,
      otp,
      expiresAt,
      resendAttempts,
      lastResendAt: Date.now(),
      lockoutUntil: null,
    });
    console.log(`Store update took ${Date.now() - storeStart}ms`);

    // Send OTP email
    const emailStart = Date.now();
    await sendOTPEmail(
      email,
      otp,
      storedData.purpose === "signup" ? "Verify Your Email - OTP" : "Password Reset OTP",
      storedData.purpose === "signup" ? "Email Verification" : "Password Reset"
    );
    console.log(`Email sending took ${Date.now() - emailStart}ms`);

    console.log(`OTP resent to ${email}. Resend attempt ${resendAttempts} of 4. Total time: ${Date.now() - startTime}ms`);

    res.status(200).json({
      message: `OTP resent to your email. Please verify to complete ${storedData.purpose === "signup" ? "signup" : "password reset"}.`,
      email,
      resendAttempts,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
      resendAttempts,
      purpose: "password-reset",
    });

    await sendOTPEmail(email, otp, "Password Reset OTP", "Password Reset");

    res.status(200).json({
      message: "OTP sent to your email for password reset.",
      email,
      resendAttempts,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    const storedData = otpStore.get(email);
    if (!storedData || storedData.purpose !== "password-reset") {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    otpStore.delete(email);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
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
      // .populate("block", "blockName blockCode")
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
router.get("/deleted-logs", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const deletedLogs = await DeletedLog.find()
      .sort({ deletedAt: -1 })
      .lean();

    res.status(200).json(deletedLogs);
  } catch (error) {
    console.error("Fetch deleted logs error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a user
router.put("/users/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // const { name, email, roles, phone, houseNo, block, branch, department } = req.body;
    const { name, email, roles, phone, branch, department } = req.body;

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

    const validRoles = ["EndUser", "ServiceProvider", "Admin", "SuperAdmin"];
    if (!roles.every((role) => validRoles.includes(role))) {
      return res.status(400).json({ message: "Invalid role(s)" });
    }
    if ((roles.includes("EndUser") || roles.includes("ServiceProvider")) && !phone) {
      return res.status(400).json({ message: "Phone is required for EndUser or ServiceProvider" });
    }

    // if (roles.includes("EndUser") && (!houseNo || !block)) {
    //   return res.status(400).json({ message: "House number and block are required for EndUser" });
    // }
    if (roles.includes("ServiceProvider") && (!branch || !department)) {
      return res.status(400).json({
        message: "Branch and department are required for Service Provider",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user.userId && user.roles.includes("SuperAdmin") && !roles.includes("SuperAdmin")) {
      return res.status(403).json({ message: "Cannot remove SuperAdmin role from yourself" });
    }

    user.name = name;
    user.email = email;
    user.roles = roles;
    user.phone = phone || undefined;
    // user.houseNo = houseNo || undefined;
    // user.block = block || undefined;
    user.branch = branch || undefined;
    user.department = department || undefined;

    await user.save();

    const updatedUser = await User.findById(id)
      .select("-password")
      // .populate("block", "blockName blockCode")
      .populate("branch", "branchName branchCode")
      .populate("department", "departmentName departmentCode")
      .lean();

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a user
router.delete("/users/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // const user = await User.findById(id).populate("block branch department");
    const user = await User.findById(id).populate("branch department");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user.userId) {
      return res.status(403).json({ message: "Cannot delete your own account" });
    }

    const deletedLog = new DeletedLog({
      entityType: "User",
      entityDetails: {
        name: user.name,
        email: user.email,
        roles: user.roles,
        phone: user.phone,
        // houseNo: user.houseNo,
        password: user.password,
        // block: user.block
        //   ? {
        //     _id: user.block._id,
        //     blockCode: user.block.blockCode,
        //     blockName: user.block.blockName,
        //   }
        //   : null,
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
      reason: "",
    });
    await deletedLog.save();

    await user.deleteOne();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;