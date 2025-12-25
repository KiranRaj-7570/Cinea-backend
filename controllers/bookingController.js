import crypto from "crypto";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import razorpay from "../config/razorpay.js";
import { cleanupExpiredLocks } from "../utils/cleanupLocks.js";
import { fetchTMDB } from "../utils/tmdb.js";
import { delCache } from "../utils/cache.js";

export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { movieId, showId, seats } = req.body;

    if (!movieId || !showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Missing booking details" });
    }

    await cleanupExpiredLocks(showId);

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    const userLockedSeats = show.lockedSeats
      .filter((s) => s.userId.toString() === userId)
      .map((s) => s.seatId);

    const allLocked = seats.every((seat) => userLockedSeats.includes(seat));

    if (!allLocked) {
      return res.status(409).json({ message: "Seats are no longer locked" });
    }

    const amount = seats.reduce((sum, seat) => {
      const row = seat[0]; // "A1" → "A"
      return sum + (show.priceMap.get(row) || 0);
    }, 0);

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    const booking = await Booking.create({
      userId,
      movieId,
      showId,
      seats,
      amount,
      razorpayOrderId: order.id,
      paymentStatus: "pending",
    });

    res.json({
      bookingId: booking._id,
      orderId: order.id,
      amount,
      key: process.env.RAZORPAY_KEY_ID,
    });
    try {
      delCache(`home_activity_${userId}`);
      delCache(`home_booked_${userId}`);
    } catch (err) {
      console.warn("Cache clear failed:", err.message);
    }
  } catch (err) {
    console.error("Create booking error", err);
    res.status(500).json({ message: "Booking failed" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.paymentStatus === "paid") {
      return res.json({ message: "Already verified" });
    }

    booking.paymentStatus = "paid";
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    await booking.save();

    const show = await Show.findById(booking.showId);

    show.bookedSeats.push(...booking.seats);
    show.lockedSeats = show.lockedSeats.filter(
      (s) => !booking.seats.includes(s.seatId)
    );

    await show.save();

    res.json({ message: "Payment verified & booking confirmed" });
  } catch (err) {
    console.error("Verify payment error", err);
    res.status(500).json({ message: "Payment verification failed" });
  }
};

export const paymentFailed = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.sendStatus(200);

    booking.paymentStatus = "failed";
    await booking.save();

    const show = await Show.findById(booking.showId);
    show.lockedSeats = show.lockedSeats.filter(
      (s) => !booking.seats.includes(s.seatId)
    );

    await show.save();

    res.sendStatus(200);
  } catch (err) {
    console.error("Payment failed handler error", err);
    res.sendStatus(500);
  }
};

export const getMyBookings = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const userId = req.user.id;

    const bookings = await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "showId",
        populate: { path: "theatreId", select: "name" },
      });

    const now = new Date();

    const result = await Promise.all(
      bookings.map(async (b) => {
        if (!b.showId) return null;

        const show = b.showId;
        const showDateTime = new Date(`${show.date}T${show.time}`);

        // ✅ COMPUTED STATUS (SOURCE OF TRUTH)
        let status = "paid";

        if (b.bookingStatus === "cancelled") status = "cancelled";
        else if (showDateTime < now) status = "expired";

        const canCancel =
          status === "paid" && showDateTime - now > 60 * 60 * 1000;
        // 🎬 TMDB
        let movie = {};
        try {
          const data = await fetchTMDB(`/movie/${b.movieId}`);
          movie = {
            title: data.title,
            poster: data.poster_path,
          };
        } catch {
          movie = { title: "Movie", poster: null };
        }

        return {
          bookingId: b._id,
          createdAt: b.createdAt,
          seats: b.seats,
          status, // ✅ THIS FIXES EVERYTHING
          canCancel,

          movie,
          show: {
            theatre: show.theatreId?.name || "Theatre",
            date: show.date,
            time: show.time,
          },
        };
      })
    );

    res.json(result.filter(Boolean));
  } catch (err) {
    console.error("My bookings error", err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

export const getBookingTicket = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      userId: req.user.id,
      paymentStatus: "paid",
    }).populate({
      path: "showId",
      populate: { path: "theatreId" },
    });

    if (!booking) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (booking.bookingStatus === "cancelled") {
      return res.status(403).json({
        message: "This booking has been cancelled",
      });
    }

    const movie = await fetchTMDB(`/movie/${booking.movieId}`);

    res.json({
      bookingId: booking._id,
      seats: booking.seats,
      amount: booking.amount,

      movie: {
        title: movie.title,
        poster: movie.poster_path,
      },

      show: {
        date: booking.showId.date,
        time: booking.showId.time,
        theatre: booking.showId.theatreId.name,
        screen: booking.showId.screenNumber,
      },
    });
  } catch (err) {
    console.error("Ticket load error", err);
    res.status(500).json({ message: "Failed to load ticket" });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      userId: req.user.id,
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.bookingStatus !== "active")
      return res
        .status(400)
        .json({ message: "Booking already cancelled or expired" });

    booking.bookingStatus = "cancelled";
    booking.cancelledAt = new Date();
    booking.paymentStatus = "refunded";

    await booking.save();

    res.json({ message: "Booking cancelled successfully" });
  } catch (err) {
    console.error("Cancel booking error", err);
    res.status(500).json({ message: "Cancel failed" });
  }
};
