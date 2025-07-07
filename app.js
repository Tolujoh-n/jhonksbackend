const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config({ path: "./config.env" });

const rootRouter = require("./src/router/index");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(cookieParser());

// Database connection
// mongoose
//   .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jhonks-demo-db")
//   .then(() => console.log("✅ Connected to MongoDB"))
//   .catch((err) => console.log("❌ MongoDB connection error:", err));

// Routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to Jhonks Enviromental APIs 🚀",
    timestamp: new Date().toISOString(),
  });
});


app.use("/api", rootRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Jhonks API is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jhonks-demo-db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");

    // Now safe to start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.CORS_ORIGIN || "http://localhost:3000"}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

