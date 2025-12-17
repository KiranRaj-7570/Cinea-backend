import crypto from "crypto";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import razorpay from "../config/razorpay.js";
import { cleanupExpiredLocks } from "../utils/cleanupLocks.js";
import { fetchTMDB } from "../utils/tmdb.js";

/**
 * POST /api/bookings/create
 * Create booking + Razorpay order
 */
export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { movieId, showId, seats } = req.body;

    if (!movieId || !showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Missing booking details" });
    }

    // cleanup expired locks for this show
    await cleanupExpiredLocks(showId);

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    // ✅ ensure seats are locked by THIS user
    const userLockedSeats = show.lockedSeats
      .filter((s) => s.userId.toString() === userId)
      .map((s) => s.seatId);

    const allLocked = seats.every((seat) =>
      userLockedSeats.includes(seat)
    );

    if (!allLocked) {
      return res
        .status(409)
        .json({ message: "Seats are no longer locked" });
    }

    // ✅ calculate amount using priceMap
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
  } catch (err) {
    console.error("Create booking error", err);
    res.status(500).json({ message: "Booking failed" });
  }
};

/**
 * POST /api/bookings/verify
 * Verify Razorpay payment
 */
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

    // 🔥 move locked → booked
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

/**
 * POST /api/bookings/failed
 * Release seats on payment failure
 */
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
    const userId = req.user.id;

    const bookings = await Booking.find({
      userId,
      paymentStatus: "paid", // ✅ hide failed payments
    }).sort({ createdAt: -1 });

    const result = await Promise.all(
      bookings.map(async (b) => {
        const show = await Show.findById(b.showId).populate("theatreId");

        // ✅ THIS IS THE ONLY CORRECT WAY
        const movie = await fetchTMDB(`/movie/${b.movieId}`);

        return {
          bookingId: b._id,
          status: b.paymentStatus,
          seats: b.seats,

          movie: {
            title: movie.title,
            poster: movie.poster_path,
          },

          show: {
            theatre: show.theatreId.name,
            date: show.date,
            time: show.time,
          },
        };
      })
    );

    res.json(result);
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
    res.status(500).json({ message: "Failed to load ticket" });
  }
};
