import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Note, User } from "./model.js"; // Import User model
import { validateNoteInput, authenticateToken } from "./middleware.js"; // Import authenticateToken

const router = express.Router();

// --- Authentication Routes ---
router.post("/auth/register", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Username and password are required",
        });
    }
    // Basic password validation (e.g., length)
    if (password.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
    }

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });
    }

    const user = await User.create({ username, password });
    res
      .status(201)
      .json({
        success: true,
        message: "User registered successfully",
        userId: user.id,
      });
  } catch (error) {
    if (error.message === "Username already exists") {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });
    }
    next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Username and password are required",
        });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid credentials (user not found)",
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid credentials (password mismatch)",
        });
    }

    const accessToken = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    ); // Token expires in 1 hour
    res.json({ success: true, accessToken, username: user.username });
  } catch (error) {
    next(error);
  }
});

// --- Notes Routes (Protected) ---
// Apply authenticateToken middleware to all /notes routes

// Get all notes for the logged-in user
router.get("/notes", authenticateToken, async (req, res, next) => {
  //
  try {
    const notes = await Note.find(req.user.id); // Pass userId from token
    res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (error) {
    next(error);
  }
});

// Get a single note for the logged-in user
router.get("/notes/:id", authenticateToken, async (req, res, next) => {
  //
  try {
    const note = await Note.findById(req.params.id, req.user.id); // Pass userId
    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found or you don't have access",
      });
    }
    res.status(200).json({
      success: true,
      data: note,
    });
  } catch (error) {
    next(error);
  }
});

// Create a new note for the logged-in user
router.post(
  "/notes",
  authenticateToken,
  validateNoteInput,
  async (req, res, next) => {
    //
    try {
      const { title, content, tags } = req.body;
      const note = await Note.create({
        title,
        content,
        tags,
        userId: req.user.id, // Add userId from token
      });
      res.status(201).json({
        success: true,
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update a note for the logged-in user
router.put(
  "/notes/:id",
  authenticateToken,
  validateNoteInput,
  async (req, res, next) => {
    //
    try {
      const { title, content, tags } = req.body;
      const updatedNote = await Note.findByIdAndUpdate(
        req.params.id,
        {
          title,
          content,
          tags,
        },
        req.user.id
      ); // Pass userId

      if (!updatedNote) {
        return res.status(404).json({
          success: false,
          message: "Note not found or you don't have access to update it",
        });
      }
      // The findByIdAndUpdate in model now returns the updated note (or fetches it)
      res.status(200).json({
        success: true,
        data: updatedNote, // Send back the updated note
        message: "Note updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a note for the logged-in user
router.delete("/notes/:id", authenticateToken, async (req, res, next) => {
  //
  try {
    const note = await Note.findByIdAndDelete(req.params.id, req.user.id); // Pass userId
    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found or you don't have access to delete it",
      });
    }
    res.status(200).json({
      success: true,
      data: {},
      message: "Note deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
