import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";

export const getAdminKpis = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString("en-CA");
    // 1️⃣ Total Bookings
    const seatsAgg = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          bookingStatus: { $ne: "cancelled" },
        },
      },
      {
        $project: {
          seatCount: { $size: "$seats" },
        },
      },
      {
        $group: {
          _id: null,
          totalSeats: { $sum: "$seatCount" },
        },
      },
    ]);

    const totalBookings = seatsAgg[0]?.totalSeats || 0;

    // 2️⃣ Total Revenue
    const revenueAgg = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          bookingStatus: { $ne: "cancelled" }, // optional but recommended
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    // 3️⃣ Active Movies (from shows)
    const activeMovieIds = await Show.distinct("movieId", {
      date: { $gte: today },
    });

    // 4️⃣ Active Theatres
    const activeTheatres = await Theatre.countDocuments({
      isActive: true,
    });

    res.json({
      totalBookings,
      totalRevenue,
      activeMovies: activeMovieIds.length,
      activeTheatres,
    });
  } catch (err) {
    console.error("Admin KPI error:", err);
    res.status(500).json({ message: "Failed to load KPIs" });
  }
};
