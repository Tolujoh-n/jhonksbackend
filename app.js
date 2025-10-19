const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config({ path: "./config.env" });

const rootRouter = require("./src/router/index");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Handle large payloads for image uploads
app.use((req, res, next) => {
  if (req.url.includes('/bounty/admin/create') || req.url.includes('/bounty/admin/')) {
    // Increase limit for bounty operations
    req.setTimeout(30000); // 30 seconds timeout
  }
  next();
});

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map(origin => origin.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());

// Database connection with optimized settings
const mongooseOptions = {
  // Connection timeout settings
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds
  
  // Connection pool settings
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5, // Maintain a minimum of 5 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Heartbeat settings
  heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
  
  // Compression
  compressors: ['zlib'],
  
  // Write concern
  w: 'majority',
  journal: true, // Request acknowledgment that the write has been written to the journal
};

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jhonks-demo-db", mongooseOptions)
  .then(() => console.log("✅ Connected to MongoDB with optimized settings"))
  .catch((err) => {
    console.log("❌ MongoDB connection error:", err);
    console.log("Connection string:", process.env.MONGODB_URI ? "Using Atlas" : "Using local");
  });

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB');
});

// Handle application termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔴 Mongoose connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error closing mongoose connection:', err);
    process.exit(1);
  }
});

// Routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to Jhonks Enviromental APIs 🚀",
    timestamp: new Date().toISOString(),
  });
});


// Database connection middleware
app.use("/api", (req, res, next) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    console.warn(`⚠️ Database not connected. State: ${mongoose.connection.readyState}`);
    return res.status(503).json({
      status: "error",
      message: "Database connection is not available. Please try again later.",
      timestamp: new Date().toISOString(),
    });
  }
  next();
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

// Database health check endpoint
app.get("/health/db", async (req, res) => {
  try {
    // Test database connection
    await mongoose.connection.db.admin().ping();
    
    res.status(200).json({
      status: "success",
      message: "Database connection is healthy",
      timestamp: new Date().toISOString(),
      connectionState: mongoose.connection.readyState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Database connection is unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      connectionState: mongoose.connection.readyState,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Handle database timeout errors specifically
  if (err.message?.includes('buffering timed out') || 
      err.message?.includes('timeout') ||
      err.code === 'ETIMEDOUT' ||
      err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      status: "error",
      message: "Database connection timeout. Please try again in a moment.",
      retryAfter: 5,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Handle MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
    return res.status(503).json({
      status: "error",
      message: "Database connection is temporarily unavailable. Please try again later.",
      timestamp: new Date().toISOString(),
    });
  }
  
  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join user to their personal room
  socket.on("join-user-room", (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });

  // Join chat room
  socket.on("join-chat", (chatId) => {
    socket.join(`chat-${chatId}`);
    console.log(`User joined chat ${chatId}`);
  });

  // Leave chat room
  socket.on("leave-chat", (chatId) => {
    socket.leave(`chat-${chatId}`);
    console.log(`User left chat ${chatId}`);
  });

  // Handle new message
  socket.on("new-message", (data) => {
    socket.to(`chat-${data.chatId}`).emit("message-received", data);
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    socket.to(`chat-${data.chatId}`).emit("user-typing", data);
  });

  socket.on("stop-typing", (data) => {
    socket.to(`chat-${data.chatId}`).emit("user-stopped-typing", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io available to other modules
app.set("io", io);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jhonks-demo-db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");

    // Now safe to start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.CORS_ORIGIN || "http://localhost:3000"}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
