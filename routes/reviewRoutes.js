import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  createReview,
  listReviews,
  updateReview,
  deleteReview,
  replyToReview,
  toggleLike,
  reportReview,
} from "../controllers/reviewController.js";

const router = express.Router();

router.get("/:mediaType/:tmdbId", listReviews); // public read
router.post("/", verifyToken, createReview);
router.put("/:reviewId", verifyToken, updateReview); // NEW
router.delete("/:reviewId", verifyToken, deleteReview); // NEW
router.post("/:reviewId/reply", verifyToken, replyToReview);
router.post("/:reviewId/like", verifyToken, toggleLike);
router.post("/:reviewId/report", verifyToken, reportReview); // NEW

export default router;