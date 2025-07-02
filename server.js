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
const feedbackRoutes = require("./routes/feedback");
const User = require("./model/User"); // Path to your User model
const morgan = require ('morgan');
require("dotenv").config(); // Load environment variables

const app = express();

// Middleware
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

app.use(morgan('dev'));

// Validate environment variables
const requiredEnvVars = ["Environment", "MONGO_URI", "PORT"];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

// Determine the database name based on the environment
const isDevelopment = process.env.Environment === "development";
const dbName = isDevelopment ? "bugbuster-testing" : "BugBuster";

// MongoDB connection string
const mongoUri = process.env.MONGO_URI.replace("{{DB_NAME}}", dbName);

// MongoDB connection options
const mongooseOptions = {
  // Removed deprecated options: useNewUrlParser, useUnifiedTopology
  maxPoolSize: 10, // Maximum number of socket connections
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Timeout for socket inactivity
  family: 4, // Use IPv4, avoids issues with IPv6
};

// Function to connect to MongoDB
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(mongoUri, mongooseOptions);
    console.log(`Connected to MongoDB (${dbName})`);

    // Check if manager@nitsel.com exists
    const existingUser = await User.findOne({ email: "manager@nitsel.com" });

    if (!existingUser) {
      console.log("No user with email manager@nitsel.com found. Creating default super admin...");

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
      console.log("User with email manager@nitsel.com already exists. Skipping default user creation.");
    }
  } catch (err) {
    console.error("MongoDB connection error:", err);
    // Retry connection after a delay
    setTimeout(connectToMongoDB, 5000);
  }
};

// Handle MongoDB connection events
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose disconnected from MongoDB. Attempting to reconnect...");
  connectToMongoDB();
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

// Handle process termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Mongoose connection closed due to app termination");
  process.exit(0);
});

// Initiate MongoDB connection
connectToMongoDB();

// Routes
app.get("/", (req, res) => {
  console.log(process.env.Environment);
  res.send(`API is running... - ${process.env.Environment === "development" ? "Dev" : "Prod"}`);
});

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/logs", logsRouter);
app.use("/api/feedback", feedbackRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});