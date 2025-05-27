const express = require("express");
const router = express.Router();
const Issue = require("../model/Issue");
const Branch = require("../model/Branch");
const Department = require("../model/Department");
const User = require("../model/User");
const DeletedLog = require("../model/DeletedLogs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
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
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png) and PDFs are allowed"));
    }
  },
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access token required" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Get issues
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { assignedTo, createdBy } = req.query;
    const query = {};
    if (assignedTo) query.assignedTo = assignedTo;
    if (createdBy) query.createdBy = createdBy;

    const issues = await Issue.find({
      $or: Object.entries(query).map(([key, value]) => ({
        [key]: value,
      })),
    })
      .populate("branch", "branchCode branchName")
      .populate("department", "departmentCode departmentName")
      .populate("assignedTo", "name email _id")
      .populate("createdBy", "name email _id")
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (error) {
    console.error("Get issues error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get dropdown data
router.get("/dropdowns", authenticateToken, async (req, res) => {
  try {
    const branches = await Branch.find().select("branchCode branchName");
    const departments = await Department.find().select(
      "departmentCode departmentName"
    );
    const users = await User.find({ roles: { $nin: ["EndUser"] } }).select(
      "name email branch department _id roles"
    );
    res.json({ branches, departments, users });
  } catch (error) {
    console.error("Get dropdowns error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new issue
router.post(
  "/",
  authenticateToken,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const {
        userName,
        branch,
        department,
        assignedTo,
        description,
        status,
        priority,
      } = req.body;

      console.log("Request body:", req.body);
      console.log("File:", req.file);

      if (
        !userName ||
        !branch ||
        !department ||
        !assignedTo ||
        !description ||
        !status ||
        !priority
      ) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!["High", "Medium", "Low"].includes(priority)) {
        return res.status(400).json({ message: "Invalid priority value" });
      }

      if (!["pending", "in-progress", "resolved"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const userExists = await User.findById(assignedTo);
      if (!userExists) {
        return res.status(400).json({ message: "Invalid assignedTo user ID" });
      }

      let attachmentUrl = null;
      if (req.file) {
        console.log("Uploading to Cloudinary...");
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: "bugbuster_issues",
                resource_type: "auto",
              },
              (error, result) => {
                if (error) {
                  console.error("Cloudinary upload error:", error);
                  return reject(error);
                }
                resolve(result);
              }
            )
            .end(req.file.buffer);
        });
        attachmentUrl = result.secure_url;
        console.log("Cloudinary URL:", attachmentUrl);
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
      });

      await issue.save();
      console.log("Saved issue:", issue);

      const populatedIssue = await Issue.findById(issue._id)
        .populate("branch", "branchCode branchName")
        .populate("department", "departmentCode departmentName")
        .populate("assignedTo", "name email _id")
        .populate("createdBy", "name email _id");

      res
        .status(201)
        .json({ message: "Issue created successfully", issue: populatedIssue });
    } catch (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update an issue
router.put(
  "/:id",
  authenticateToken,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const issueId = req.params.id;
      const {
        userName,
        branch,
        department,
        assignedTo,
        description,
        status,
        priority,
        rating,
      } = req.body;

      // Validate priority if provided
      if (priority && !["High", "Medium", "Low"].includes(priority)) {
        return res.status(400).json({ message: "Invalid priority value" });
      }

      // Validate status if provided
      if (status && !["pending", "in-progress", "resolved"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      // Validate rating if provided
      if (rating !== undefined) {
        const ratingNum = Number(rating);
        if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) {
          return res
            .status(400)
            .json({ message: "Rating must be a number between 0 and 5" });
        }
      }

      // Find the issue
      const issue = await Issue.findById(issueId)
        .populate("assignedTo", "_id")
        .populate("createdBy", "_id");
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }

      // Find the user to check their roles
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check permissions
      const isSuperAdmin = user.roles.includes("SuperAdmin");
      const isAdmin = user.roles.includes("Admin");
      const isAssignee =
        issue.assignedTo && issue.assignedTo._id.toString() === req.user.userId;
      const isCreator =
        issue.createdBy && issue.createdBy._id.toString() === req.user.userId;

      // If rating is provided, only creator, Admin, or SuperAdmin can submit it
      if (rating !== undefined && !(isCreator || isAdmin || isSuperAdmin)) {
        return res.status(403).json({
          message:
            "Only the task creator, Admin, or SuperAdmin can provide a rating",
        });
      }

      // Prepare update data
      const updateData = {};
      if (userName) updateData.userName = userName;
      if (branch) updateData.branch = branch;
      if (department) updateData.department = department;
      if (assignedTo) updateData.assignedTo = assignedTo;
      if (description) updateData.description = description;
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (rating !== undefined && (isCreator || isAdmin || isSuperAdmin))
        updateData.rating = Number(rating);

      // If status is changed to 'pending' or 'in-progress' by creator, Admin, or SuperAdmin, set rating to null
      if (
        status &&
        ["pending", "in-progress"].includes(status) &&
        (isCreator || isAdmin || isSuperAdmin)
      ) {
        updateData.rating = null;
      }

      if (req.file) {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: "bugbuster_issues",
                resource_type: "auto",
              },
              (error, result) => {
                if (error) reject(error);
                resolve(result);
              }
            )
            .end(req.file.buffer);
        });
        updateData.attachment = result.secure_url;
      }

      // If only status (and optionally rating) is provided and user is Admin, SuperAdmin, or assignee, allow update
      if (
        status &&
        Object.keys(req.body).every((key) =>
          ["status", "rating"].includes(key)
        ) &&
        !req.file &&
        (isAdmin || isSuperAdmin || isAssignee)
      ) {
        const updatedIssue = await Issue.findByIdAndUpdate(
          issueId,
          { $set: updateData },
          { new: true }
        )
          .populate("branch", "branchCode branchName")
          .populate("department", "departmentCode departmentName")
          .populate("assignedTo", "name email _id")
          .populate("createdBy", "name email _id");

        return res.json({
          message: "Issue updated successfully",
          issue: updatedIssue,
        });
      }

      // Otherwise, restrict updates to creator, Admin, or SuperAdmin
      if (!isCreator && !isAdmin && !isSuperAdmin && !isAssignee) {
        return res
          .status(403)
          .json({ message: "Unauthorized to update this issue" });
      }

      const updatedIssue = await Issue.findByIdAndUpdate(
        issueId,
        { $set: updateData },
        { new: true }
      )
        .populate("branch", "branchCode branchName")
        .populate("department", "departmentCode departmentName")
        .populate("assignedTo", "name email _id")
        .populate("createdBy", "name email _id");

      res.json({ message: "Issue updated successfully", issue: updatedIssue });
    } catch (error) {
      console.error("Error updating issue:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete an issue
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const issueId = req.params.id;
    const issue = await Issue.findById(issueId)
      .populate("branch", "branchCode branchName")
      .populate("department", "departmentCode departmentName")
      .populate("assignedTo", "name email _id")
      .populate("createdBy", "name email _id");
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Find the user to check their roles
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isSuperAdmin = user.roles.includes("SuperAdmin");
    const isAdmin = user.roles.includes("Admin");
    const isIssueOwner = req.user.userId === issue.createdBy._id.toString();

    if (!(isSuperAdmin || isAdmin || isIssueOwner)) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this issue" });
    }

    // Log the deletion to deletedLogs
    const deletedLog = new DeletedLog({
      entityType: "Issue",
      entityDetails: {
        userName: issue.userName,
        branch: issue.branch
          ? {
              _id: issue.branch._id,
              branchCode: issue.branch.branchCode,
              branchName: issue.branch.branchName,
            }
          : null,
        department: issue.department
          ? {
              _id: issue.department._id,
              departmentCode: issue.department.departmentCode,
              departmentName: issue.department.departmentName,
            }
          : null,
        assignedTo: issue.assignedTo
          ? {
              _id: issue.assignedTo._id,
              name: issue.assignedTo.name,
              email: issue.assignedTo.email,
            }
          : null,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        attachment: issue.attachment,
        rating: issue.rating,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
      },
      deletedBy: {
        userId: req.user.userId,
        name: req.user.name || "Unknown",
        email: req.user.email || "Unknown",
      },
      deletedAt: new Date(),
      reason: "", // No reason provided in UI
    });
    await deletedLog.save();

    // Delete attachment from Cloudinary if exists
    if (issue.attachment) {
      const publicId = issue.attachment.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`bugbuster_issues/${publicId}`);
    }

    // Delete the issue from the database
    await Issue.findByIdAndDelete(issueId);
    res.json({ message: "Issue deleted successfully" });
  } catch (error) {
    console.error("Error deleting issue:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /send-email - Send email notification to assignee
router.post("/send-email", authenticateToken, async (req, res) => {
  try {
    const {
      issueId,
      assignedToEmail,
      assignedToName,
      taskDescription,
      createdByName,
    } = req.body;

    // Validate required fields
    if (!issueId || !assignedToEmail || !taskDescription || !createdByName) {
      return res.status(400).json({
        message:
          "Missing required fields: issueId, assignedToEmail, taskDescription, createdByName",
      });
    }

    // Find the issue with populated fields
    const issue = await Issue.findById(issueId)
      .populate("assignedTo", "name email _id")
      .populate("createdBy", "name email _id");
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Verify the requester is the creator
    if (issue.createdBy._id.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Only the task creator can send this email" });
    }

    // Validate assignee email
    if (issue.assignedTo.email !== assignedToEmail) {
      return res.status(400).json({
        message: "Provided assignee email does not match issue assignee",
      });
    }

    // Prepare email
    const mailOptions = {
      from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
      to: assignedToEmail,
      subject: `Task Reopened: ${issueId}`,
      html: `
        <h2>Task Reopened Notification</h2>
        <p>Dear ${assignedToName || "User"},</p>
        <p>The task with ID <strong>${issueId}</strong> has been reopened by <strong>${createdByName}</strong>.</p>
        <p><strong>Task Description:</strong> ${taskDescription}</p>
        <p>Please review the task and take appropriate action.</p>
        <p>Best regards,<br/>BUGBUSTER Team</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res
      .status(500)
      .json({ message: "Failed to send email", error: error.message });
  }
});

router.put("/:id/reopen", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the issue with populated fields
    const issue = await Issue.findById(id)
      .populate("assignedTo", "name email _id")
      .populate("createdBy", "name email _id");
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // Verify the requester is the creator
    if (issue.createdBy._id.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Only the task creator can reopen this issue" });
    }

    // Extract required fields from the issue
    const assignedToEmail = issue.assignedTo.email;
    const assignedToName = issue.assignedTo.name;
    const description = issue.description; // Changed from taskDescription to description
    const createdByName = issue.createdBy.name;

    // Validate required fields
    if (!assignedToEmail || !description || !createdByName) {
      return res.status(400).json({
        message:
          "Missing required fields in issue: assignedToEmail, description, createdByName",
      });
    }

    // Update issue status to pending
    issue.status = "pending";
    await issue.save();

    // Prepare email
    const mailOptions = {
      from: `"BUGBUSTER Team" <${process.env.EMAIL_USER}>`,
      to: assignedToEmail,
      subject: `Task Reopened: ${id}`,
      html: `
        <h2>Task Reopened Notification</h2>
        <p>Dear ${assignedToName || "User"},</p>
        <p>The task with ID <strong>${id}</strong> has been reopened by <strong>${createdByName}</strong>.</p>
        <p><strong>Task Description:</strong> ${description}</p>
        <p>Please review the task and take appropriate action.</p>
        <p>Best regards,<br/>BUGBUSTER Team</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    res
      .status(200)
      .json({ message: "Issue reopened and email sent successfully" });
  } catch (error) {
    console.error("Error reopening issue or sending email:", error);
    res.status(500).json({
      message: "Failed to reopen issue or send email",
      error: error.message,
    });
  }
});

module.exports = router;
