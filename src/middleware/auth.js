const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    console.log("=== AUTH MIDDLEWARE DEBUG ===");
    console.log("Request URL:", req.originalUrl);
    console.log("Request headers:", req.headers);
    
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token extracted:", token ? "Yes" : "No");
    }

    if (!token) {
      console.log("No token found in request");
      return res.status(401).json({
        status: "fail",
        message: "You are not logged in. Please log in to get access.",
      });
    }

    console.log("Verifying JWT token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    
    console.log("Looking up user with ID:", decoded.id);
    const user = await User.findById(decoded.id);
    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      console.log("User not found in database");
      return res.status(401).json({
        status: "fail",
        message: "The user belonging to this token no longer exists.",
      });
    }

    console.log("Setting user in request:", user._id);
    req.user = user;
    console.log("=== END AUTH DEBUG ===");
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    console.error("Error message:", error.message);
    res.status(401).json({
      status: "fail",
      message: "Invalid token. Please log in again.",
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};
