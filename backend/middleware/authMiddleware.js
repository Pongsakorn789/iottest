const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY || "your_secret_key";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Access token is missing or invalid" });
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // เพิ่ม user.id ใน req.user
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticateToken;
