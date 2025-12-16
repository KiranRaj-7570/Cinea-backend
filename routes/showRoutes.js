import express from "express";
import {
  getShowById,
  getShowsByMovie,
  getShowSeats,
  lockSeats,
} from "../controllers/showController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * MOST SPECIFIC ROUTES FIRST
 */
router.get("/movie/:movieId", getShowsByMovie);
router.get("/:showId/seats", getShowSeats);
router.post("/:showId/lock-seats", verifyToken, lockSeats);

/**
 * GENERIC ROUTE LAST (IMPORTANT)
 */
router.get("/:showId", getShowById);

export default router;
