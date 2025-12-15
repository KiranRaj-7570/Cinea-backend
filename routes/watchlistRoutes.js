import express from "express";

import { addToWatchlist, removeFromWatchlist, getWatchlist, markAsCompleted } from "../controllers/watchlistController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", addToWatchlist);
router.delete("/:mediaType/:tmdbId", removeFromWatchlist);
router.get("/", getWatchlist);
router.patch(
  "/:mediaType/:tmdbId/complete",
  verifyToken,
  markAsCompleted
);

export default router;
