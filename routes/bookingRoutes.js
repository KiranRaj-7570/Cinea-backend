import express from "express";
import {
  createBooking,
  verifyPayment,
  paymentFailed,
  getMyBookings,
  getBookingTicket,
  cancelBooking,
} from "../controllers/bookingController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", verifyToken, createBooking);

router.post("/verify", verifyToken, verifyPayment);
router.post("/failed", verifyToken, paymentFailed);
router.get("/my", verifyToken, getMyBookings);
router.get("/:bookingId", verifyToken, getBookingTicket);
router.post("/:bookingId/cancel", verifyToken, cancelBooking);
export default router;
 