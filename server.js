import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import movieRoutes from "./routes/movieRoutes.js"
import tvRoutes from "./routes/tvRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
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


app.use("/auth", authRoutes);
app.use("/movies", movieRoutes);
app.use("/shows", tvRoutes);
app.use("/watchlist", watchlistRoutes);
app.use("/progress/tv", progressRoutes);
app.use("/reviews", reviewRoutes);


app.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user, 
  });
});


app.get("/admin-test", verifyToken, adminOnly, (req, res) => {
  res.json({
    message: "Welcome, Admin! Admin route accessed successfully.",
  });
});

app.get("/", (req, res) => {
  res.send("Backend Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));