import express from "express";
import { getShowById, getShowsByMovie } from "../controllers/showController.js";
import { getShowSeats, lockSeats } from "../controllers/showController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/movie/:movieId", getShowsByMovie);
router.get("/:showId", getShowById);
router.get("/:showId/seats", getShowSeats);
router.post("/:showId/lock-seats", verifyToken, lockSeats);

export default router;
