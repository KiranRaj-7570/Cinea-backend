import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import {
  getReportedReviews,
  getReviewDetail,
  dismissReport,
  deleteReviewAsAdmin,
  clearAllReports,
} from "../controllers/adminReviewController.js";

const router = express.Router();

router.get("/reviews/reported", verifyToken, isAdmin, getReportedReviews);
router.get("/reviews/:reviewId", verifyToken, isAdmin, getReviewDetail);
router.post("/reviews/:reviewId/dismiss-report", verifyToken, isAdmin, dismissReport);
router.post("/reviews/:reviewId/clear-reports", verifyToken, isAdmin, clearAllReports);
router.delete("/reviews/:reviewId", verifyToken, isAdmin, deleteReviewAsAdmin);

export default router;
