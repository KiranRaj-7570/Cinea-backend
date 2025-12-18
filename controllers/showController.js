import mongoose from "mongoose";
import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";
import { cleanupExpiredLocks } from "../utils/cleanupLocks.js";

/**
 * GET /shows/movie/:movieId?city=&date=
 */
export const getShowsByMovie = async (req, res) => {
  try {
    const { movieId } = req.params;
    const { city, date } = req.query;

    const theatres = await Theatre.find({ city });
    const theatreIds = theatres.map((t) => t._id);

    const shows = await Show.find({
      movieId: Number(movieId),
      theatreId: { $in: theatreIds },
      date,
    }).populate("theatreId");

    const grouped = {};

    const now = new Date();

    shows.forEach((show) => {
      // 🕒 build full show datetime
      const showDateTime = new Date(`${show.date}T${show.time}:00`);

      // ❌ skip past shows ONLY for today
      if (show.date === now.toISOString().slice(0, 10) && showDateTime <= now) {
        return;
      }

      const tid = show.theatreId._id.toString();

      if (!grouped[tid]) {
        grouped[tid] = {
          theatreId: tid,
          theatreName: show.theatreId.name,
          shows: [],
        };
      }

      // ✅ calculate total seats dynamically
      const screen = show.theatreId.screens.find(
        (s) => s.screenNumber === show.screenNumber
      );

      const totalSeats = screen.seatLayout.rows.reduce(
        (sum, r) => sum + r.seats,
        0
      );

      const availableSeats =
        totalSeats - show.bookedSeats.length - show.lockedSeats.length;

      grouped[tid].shows.push({
        showId: show._id,
        time: show.time,
        language: show.language,
        format: show.format,
        availableSeats,
      });
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch shows" });
  }
};

/**
 * GET /shows/:showId
 */
/**
 * GET /shows/:showId
 */
export const getShowById = async (req, res) => {
  try {
    const { showId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(showId)) {
      return res.status(400).json({ message: "Invalid show id" });
    }

    const show = await Show.findById(showId).populate("theatreId");

    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    // 🔥 FIND SCREEN LAYOUT
    const screen = show.theatreId.screens.find(
      (s) => s.screenNumber === show.screenNumber
    );

    if (!screen) {
      return res.status(500).json({
        message: "Screen layout not found for this show",
      });
    }

    res.json({
      showId: show._id,
      date: show.date,
      time: show.time,
      language: show.language,
      format: show.format,
      theatreName: show.theatreId.name,

      // ✅ THIS WAS MISSING
      seatLayout: screen.seatLayout,
      priceMap: show.priceMap, // for future price calc
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch show" });
  }
};

/**
 * GET /shows/:showId/seats
 */
export const getShowSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    // ✅ clean expired locks ONLY for this show
    await cleanupExpiredLocks(showId);

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    res.json({
      bookedSeats: show.bookedSeats || [],
      lockedSeats: show.lockedSeats || [],
    });
  } catch (err) {
    console.error("Get seats error", err);
    res.status(500).json({ message: "Failed to fetch seats" });
  }
};

/**
 * POST /shows/:showId/lock-seats
 */
export const lockSeats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { showId } = req.params;
    const { seats } = req.body;

    if (!seats || !seats.length) {
      return res.status(400).json({ message: "No seats selected" });
    }

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ message: "Show not found" });
    }

    // ❌ already booked
    if (seats.some((s) => show.bookedSeats.includes(s))) {
      return res.status(409).json({ message: "Seat already booked" });
    }

    // ❌ locked by another user
    const lockedByOthers = show.lockedSeats.some(
      (s) => seats.includes(s.seatId) && s.userId.toString() !== userId
    );

    if (lockedByOthers) {
      return res.status(409).json({ message: "Seat temporarily locked" });
    }

    // ✅ remove previous locks by same user ONCE
    show.lockedSeats = show.lockedSeats.filter(
      (s) => s.userId.toString() !== userId
    );

    // 🔒 lock new seats
    seats.forEach((seat) => {
      show.lockedSeats.push({
        seatId: seat,
        userId,
        lockedAt: new Date(),
      });
    });

    await show.save();

    res.json({ message: "Seats locked successfully" });
  } catch (err) {
    console.error("Lock seats error", err);
    res.status(500).json({ message: "Failed to lock seats" });
  }
};
