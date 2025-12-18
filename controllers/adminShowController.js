import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";

/**
 * POST /admin/shows
 * Create a show for a movie
 */
export const createShow = async (req, res) => {
  try {
    const {
      movieId,
      theatreId,
      screenNumber,
      date,
      times,
      language,
      format,
      priceMap,
    } = req.body;

    if (
      !movieId ||
      !theatreId ||
      !screenNumber ||
      !date ||
      !Array.isArray(times) ||
      times.length === 0 ||
      !priceMap ||
      Object.keys(priceMap).length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Invalid show configuration" });
    }

    // 💰 PRICE VALIDATION (CRITICAL)
    for (const row in priceMap) {
      if (
        typeof priceMap[row] !== "number" ||
        priceMap[row] <= 0
      ) {
        return res.status(400).json({
          message: `Invalid price for row ${row}`,
        });
      }
    }

    const theatre = await Theatre.findById(theatreId);
    if (!theatre) {
      return res.status(404).json({ message: "Theatre not found" });
    }

    const screenExists = theatre.screens.some(
      (s) => s.screenNumber === screenNumber
    );
    if (!screenExists) {
      return res.status(400).json({ message: "Invalid screen number" });
    }

    const createdShows = [];

    for (const time of times) {
      const exists = await Show.findOne({
        theatreId,
        screenNumber,
        date,
        time,
      });

      if (exists) continue;

      const show = await Show.create({
        movieId,
        theatreId,
        screenNumber,
        date,
        time,
        language,
        format,
        priceMap,
        bookedSeats: [],
        lockedSeats: [],
      });

      createdShows.push(show);
    }

    res.status(201).json({
      message: `${createdShows.length} shows created`,
    });
  } catch (err) {
    console.error("Create show error", err);
    res.status(500).json({ message: "Failed to create show" });
  }
};
/**
 * GET /admin/shows
 */
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find()
      .populate("theatreId", "name city")
      .sort({ date: 1, time: 1 });

    res.json(shows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch shows" });
  }
};

export const deleteShow = async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) {
    return res.status(404).json({ message: "Show not found" });
  }

  await show.deleteOne();
  res.json({ message: "Show deleted" });
};
