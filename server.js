import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import { verifyToken } from "./middleware/authMiddleware.js";
import { adminOnly } from "./middleware/adminMiddleware.js";

dotenv.config();
const app = express();

app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

connectDB();

// Routes
app.use("/auth", authRoutes);

// Simple protected route
app.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user, // will contain id & role
  });
});

// Admin-only test route
app.get("/admin-test", verifyToken, adminOnly, (req, res) => {
  res.json({
    message: "Welcome, Admin! Admin route accessed successfully.",
  });
});

app.get("/", (req, res) => {
  res.send("Cinéa Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));