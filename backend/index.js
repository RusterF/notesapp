import express from "express";
import cors from "cors";
import routes from "./controller.js";
import { connectToDatabase } from "./database.js";
import dotenv from "dotenv"; // Import dotenv

dotenv.config(); // Load .env file variables

const app = express();
const PORT = process.env.PORT || 8080; // Use environment variable for port

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", routes); //

// Basic error handler (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: "Something broke!", error: err.message });
});

app.listen(PORT, async () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
  await connectToDatabase(); //
});

export default app;
