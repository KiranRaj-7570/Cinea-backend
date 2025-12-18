import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    movieId: {
      type: Number,
      required: true,
    },

    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
    },

    seats: {
      type: [String],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    // 💳 PAYMENT STATUS (strictly payment)
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    // 🎟 BOOKING LIFECYCLE STATUS
    bookingStatus: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
  },
  { timestamps: true }
);

export default mongoose.model("Booking", BookingSchema);
