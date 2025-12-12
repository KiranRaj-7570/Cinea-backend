import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createReview, listReviews, replyToReview, toggleLike } from "../controllers/reviewController.js";

const router = express.Router();

router.get("/:mediaType/:tmdbId", listReviews); // public read
router.post("/", verifyToken, createReview);
router.post("/:reviewId/reply", verifyToken, replyToReview);
router.post("/:reviewId/like", verifyToken, toggleLike);

export default router;
