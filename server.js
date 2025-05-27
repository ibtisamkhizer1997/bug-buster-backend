const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const authRoutes = require("./routes/auth");
const branchRoutes = require("./routes/branch");
const departmentRoutes = require("./routes/department");
const issueRoutes = require("./routes/issue");
const blockRoutes = require("./routes/block");
const logsRouter = require("./routes/Logs");

// User model
const User = require("./model/User"); // Path to your User model

const app = express();

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(
    "mongodb://nitselcom:nx2twTw9LC8iOQ35@ac-qsom1hu-shard-00-00.yy5blhn.mongodb.net:27017,ac-qsom1hu-shard-00-01.yy5blhn.mongodb.net:27017,ac-qsom1hu-shard-00-02.yy5blhn.mongodb.net:27017/BugBuster?ssl=true&replicaSet=atlas-ypqioy-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(async () => {
    console.log("Connected to MongoDB");

    // Check if manager@nitsel.com exists
    const existingUser = await User.findOne({ email: "manager@nitsel.com" });
    if (!existingUser) {
      console.log(
        "No user with email manager@nitsel.com found. Creating default super admin..."
      );

      // Create default super admin user, bypassing validation
      const hashedPassword = await bcrypt.hash("manager", 10);
      const defaultUser = await User.create(
        [
          {
            name: "Manager",
            email: "manager@nitsel.com",
            password: hashedPassword,
            roles: ["SuperAdmin"],
            createdBy: new mongoose.Types.ObjectId(), // Temporary placeholder ObjectId
          },
        ],
        { validateBeforeSave: false }
      );

      // Update createdBy to self-reference
      await User.findByIdAndUpdate(defaultUser[0]._id, {
        createdBy: defaultUser[0]._id,
      });

      console.log("Default super admin created successfully");
    } else {
      console.log(
        "User with email manager@nitsel.com already exists. Skipping default user creation."
      );
    }
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/logs", logsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
