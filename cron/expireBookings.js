import cron from "node-cron";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

cron.schedule("*/5 * * * *", async () => {
  const now = new Date();

  const bookings = await Booking.find({
    bookingStatus: "active",
    paymentStatus: "paid",
  });

  for (const booking of bookings) {
    const show = await Show.findById(booking.showId);
    if (!show) continue;

    const showTime = new Date(`${show.date}T${show.time}:00`);
    const GRACE_MINUTES = 15;
    const expiryTime = new Date(showTime.getTime() + GRACE_MINUTES * 60000);

    if (expiryTime < now) {
      booking.bookingStatus = "expired";
      await booking.save();
    }
  }
});
