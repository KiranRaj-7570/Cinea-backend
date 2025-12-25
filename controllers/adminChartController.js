import Booking from "../models/Booking.js";

export const getAdminCharts = async (req, res) => {
  try {
    // 1️⃣ Revenue per day
    const revenueByDate = await Booking.aggregate([
  {
    $match: {
      paymentStatus: "paid",
      bookingStatus: { $ne: "cancelled" },
    },
  },
  {
    $project: {
      date: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt",
        },
      },
      amount: 1,
    },
  },
  {
    $group: {
      _id: "$date",          // ✅ group by DATE STRING
      total: { $sum: "$amount" },
    },
  },
  {
    $project: {
      _id: 0,
      date: "$_id",
      total: 1,
    },
  },
  { $sort: { date: 1 } },
]);


    // 2️⃣ Seats sold per day
    const seatsByDate = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          bookingStatus: { $ne: "cancelled" },
        },
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          seats: { $size: "$seats" },
        },
      },
      {
        $group: {
          _id: "$date",
          seats: { $sum: "$seats" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3️⃣ Top movies by seats sold
    const topMovies = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          bookingStatus: { $ne: "cancelled" },
        },
      },
      {
        $project: {
          movieId: 1,
          seats: { $size: "$seats" },
        },
      },
      {
        $group: {
          _id: "$movieId",
          seats: { $sum: "$seats" },
        },
      },
      { $sort: { seats: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      revenueByDate,
      seatsByDate,
      topMovies,
    });
  } catch (err) {
    console.error("Admin chart error:", err);
    res.status(500).json({ message: "Failed to load charts" });
  }
};
