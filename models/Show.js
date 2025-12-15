import mongoose from "mongoose";

const LockedSeatSchema = new mongoose.Schema(
  {
    seatId: String,              // "C8"
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lockedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ShowSchema = new mongoose.Schema(
  {
    
    movieId: { type: Number, required: true }, // TMDB ID

    theatreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theatre",
      required: true,
    },

    screenNumber: { type: Number, required: true },

    date: { type: String, required: true }, // "2025-12-14"
    time: { type: String, required: true }, // "19:30"

    language: String,
    format: { type: String, enum: ["2D", "3D"], default: "2D" },

    priceMap: {
      type: Map,
      of: Number, // { A:200, B:200, C:250 }
      required: true,
    },

    bookedSeats: { type: [String], default: [] },
    lockedSeats: { type: [LockedSeatSchema], default: [] },
  },
  { timestamps: true },
  
);

export default mongoose.model("Show", ShowSchema);
