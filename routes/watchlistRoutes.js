import express from "express";

import { addToWatchlist, removeFromWatchlist, getWatchlist, markAsCompleted, unmarkAsCompleted } from "../controllers/watchlistController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/", addToWatchlist);
router.delete("/:mediaType/:tmdbId", removeFromWatchlist);
router.get("/", getWatchlist);
router.post(
  "/:mediaType/:tmdbId/complete",
  verifyToken,
  markAsCompleted
);
router.post(
  "/:mediaType/:tmdbId/uncomplete",
  verifyToken,
  unmarkAsCompleted
);

export default router;
