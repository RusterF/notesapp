// backend/middleware.js
import jwt from "jsonwebtoken";

export const validateNoteInput = (req, res, next) => {
  //
  const { title, content } = req.body;

  if (!title || title.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Title is required",
    });
  }

  if (!content || content.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Content is required",
    });
  }

  next();
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (token == null) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT Verification Error:", err.message);
      return res
        .status(403)
        .json({ success: false, message: "Token is not valid" });
    }
    req.user = user; // Add user payload to request object
    next();
  });
};
