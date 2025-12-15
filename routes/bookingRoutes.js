import express from "express";
import {
  createBooking,
  verifyPayment,
  paymentFailed,
} from "../controllers/bookingController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Create booking + lock seats + create Razorpay order
 * POST /api/bookings/create
 */
router.post("/create", verifyToken, createBooking);

/**
 * Verify Razorpay payment
 * POST /api/bookings/verify
 */
router.post("/verify", verifyToken, verifyPayment);

/**
 * Payment failed (release seats)
 * POST /api/bookings/failed
 */
router.post("/failed", verifyToken, paymentFailed);

export default router;
