import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import movieRoutes from "./routes/movieRoutes.js"
import tvRoutes from "./routes/tvRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import showRoutes from "./routes/showRoutes.js";
import adminTheatreRoutes from "./routes/adminTheatreRoutes.js";
import adminShowRoutes from "./routes/adminShowRoutes.js";
import { verifyToken } from "./middleware/authMiddleware.js";

dotenv.config();
const app = express();

app.use(cookieParser());
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

connectDB();


app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/movies", movieRoutes);
app.use("/tvshows", tvRoutes);
app.use("/watchlist", watchlistRoutes); 
app.use("/progress/tv", progressRoutes);
app.use("/reviews", reviewRoutes);
app.use("/book", bookRoutes);
app.use("/booking", bookingRoutes);
app.use("/shows", showRoutes);

app.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user, 
  });
});


app.use("/admin", adminTheatreRoutes);
app.use("/admin", adminShowRoutes);

app.get("/", (req, res) => {
  res.send("Backend Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));