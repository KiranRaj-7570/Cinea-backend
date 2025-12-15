import Theatre from "../models/Theatre.js";

/**
 * POST /admin/theatres
 * Create a new theatre
 */
export const createTheatre = async (req, res) => {
  try {
    const { name, city, screens } = req.body;

    if (!name || !city || !screens?.length) {
      return res.status(400).json({ message: "Missing theatre details" });
    }

    const theatre = await Theatre.create({
      name,
      city,
      screens,
    });

    res.status(201).json(theatre);
  } catch (err) {
    console.error("Create theatre error", err);
    res.status(500).json({ message: "Failed to create theatre" });
  }
};

/**
 * GET /admin/theatres
 */
export const getAllTheatres = async (req, res) => {
  try {
    const theatres = await Theatre.find().sort({ createdAt: -1 });
    res.json(theatres);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch theatres" });
  }
};
