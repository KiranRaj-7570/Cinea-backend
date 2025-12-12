import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { markEpisodeWatched, getTvProgress, markSeasonWatched } from "../controllers/progressController.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", markEpisodeWatched);
router.patch("/mark-season", markSeasonWatched);
router.get("/:tmdbId", getTvProgress);

export default router;
