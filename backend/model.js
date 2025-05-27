import pool from "./database.js";
import bcrypt from "bcryptjs"; // Added in previous step for User class

export class Note {
  static async find(userId) {
    // Add userId parameter
    try {
      const [rows] = await pool.query(
        "SELECT * FROM notes WHERE user_id = ? ORDER BY createdAt DESC", // Filter by user_id
        [userId]
      );
      return rows.map((row) => ({
        ...row,
        _id: row.id,
        tags: JSON.parse(row.tags || "[]"),
      }));
    } catch (error) {
      console.error("Error fetching notes:", error);
      throw error;
    }
  }

  static async findById(id, userId) {
    // Add userId parameter
    try {
      const [rows] = await pool.query(
        "SELECT * FROM notes WHERE id = ? AND user_id = ?",
        [id, userId]
      ); // Check user_id
      if (!rows[0]) return null;
      const note = rows[0];
      return {
        ...note,
        _id: note.id,
        tags: JSON.parse(note.tags || "[]"),
      };
    } catch (error) {
      console.error(`Error finding note with id ${id}:`, error);
      throw error;
    }
  }

  static async create({ title, content, tags, userId }) {
    // Add userId parameter
    try {
      const tagsJson = JSON.stringify(tags || []);
      const [result] = await pool.query(
        "INSERT INTO notes (title, content, tags, user_id) VALUES (?, ?, ?, ?)", // Add user_id
        [title, content, tagsJson, userId]
      );
      const [newNoteRows] = await pool.query(
        "SELECT * FROM notes WHERE id = ?",
        [result.insertId]
      );
      const newNote = newNoteRows[0];
      return {
        ...newNote,
        _id: newNote.id,
        tags: JSON.parse(newNote.tags || "[]"),
      };
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  }

  static async findByIdAndUpdate(id, { title, content, tags }, userId) {
    // Add userId parameter
    try {
      // First, verify the note belongs to the user
      const existingNote = await this.findById(id, userId);
      if (!existingNote) {
        return null; // Or throw an error indicating not found or not authorized
      }

      const tagsJson = JSON.stringify(tags || []);
      await pool.query(
        "UPDATE notes SET title = ?, content = ?, tags = ? WHERE id = ? AND user_id = ?", // Check user_id
        [title, content, tagsJson, id, userId]
      );
      return this.findById(id, userId);
    } catch (error) {
      console.error(`Error updating note with id ${id}:`, error);
      throw error;
    }
  }

  static async findByIdAndDelete(id, userId) {
    // Add userId parameter
    try {
      const note = await this.findById(id, userId); // Verify ownership
      if (!note) return null;
      //
      await pool.query("DELETE FROM notes WHERE id = ? AND user_id = ?", [
        id,
        userId,
      ]); // Check user_id
      return note; // Return the note that was deleted (or just a success indicator)
    } catch (error) {
      console.error(`Error deleting note with id ${id}:`, error);
      throw error;
    }
  }
}

// User class from previous step here...
export class User {
  static async create({ username, password }) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hashedPassword]
      );
      return { id: result.insertId, username };
    } catch (error) {
      console.error("Error creating user:", error);
      if (error.code === "ER_DUP_ENTRY") {
        throw new Error("Username already exists");
      }
      throw error;
    }
  }
}
