import pool from "./database.js";
import bcrypt from "bcryptjs";

export class Note {
  static async find(userId) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM notes WHERE user_id = ? ORDER BY createdAt DESC",
        [userId]
      );
      return rows.map((row) => ({
        ...row,
        _id: row.id,
        id: row.id,
        tags: row.tags || [], // Use directly, default to empty array if null
      }));
    } catch (error) {
      console.error("Error fetching notes:", error);
      throw error;
    }
  }

  static async findById(id, userId) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM notes WHERE id = ? AND user_id = ?",
        [id, userId]
      );
      if (!rows[0]) return null;
      const note = rows[0];
      return {
        ...note,
        _id: note.id,
        id: note.id,
        tags: note.tags || [], // Use directly, default to empty array if null
      };
    } catch (error) {
      console.error(`Error finding note with id ${id}:`, error);
      throw error;
    }
  }

  static async create({ title, content, tags, userId }) {
    try {
      // Ensure tags is an array before stringifying, even if input is null/undefined
      const tagsToStore = tags && Array.isArray(tags) ? tags : [];
      const tagsJson = JSON.stringify(tagsToStore);

      const [result] = await pool.query(
        "INSERT INTO notes (title, content, tags, user_id) VALUES (?, ?, ?, ?)",
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
        id: newNote.id,
        tags: newNote.tags || [], // Use directly, default to empty array if null
      };
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  }

  static async findByIdAndUpdate(id, { title, content, tags }, userId) {
    try {
      const existingNote = await this.findById(id, userId);
      if (!existingNote) {
        return null;
      }

      // Ensure tags is an array before stringifying, even if input is null/undefined
      const tagsToStore = tags && Array.isArray(tags) ? tags : [];
      const tagsJson = JSON.stringify(tagsToStore);

      await pool.query(
        "UPDATE notes SET title = ?, content = ?, tags = ? WHERE id = ? AND user_id = ?",
        [title, content, tagsJson, id, userId]
      );
      return this.findById(id, userId);
    } catch (error) {
      console.error(`Error updating note with id ${id}:`, error);
      throw error;
    }
  }

  static async findByIdAndDelete(id, userId) {
    try {
      const note = await this.findById(id, userId);
      if (!note) return null;

      await pool.query("DELETE FROM notes WHERE id = ? AND user_id = ?", [
        id,
        userId,
      ]);
      return note;
    } catch (error) {
      console.error(`Error deleting note with id ${id}:`, error);
      throw error;
    }
  }
}

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

  static async findByUsername(username) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );
      if (rows.length > 0) {
        return rows[0];
      }
      return null;
    } catch (error) {
      console.error(`Error finding user by username ${username}:`, error);
      throw error;
    }
  }
}
