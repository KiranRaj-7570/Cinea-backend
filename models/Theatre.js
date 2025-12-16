import mongoose from "mongoose";

const ScreenSchema = new mongoose.Schema(
  {
    screenNumber: { type: Number, required: true },
    seatLayout: {
      rows: [
        {
          row: String,            // "A", "B", "C"
          seats: Number,          // seats per row
          price: Number,          // price per seat for this row
        },
      ],
    },
  },
  { _id: false }
);

const TheatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    screens: [ScreenSchema],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Theatre", TheatreSchema);