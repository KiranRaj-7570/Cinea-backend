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
    const theatres = await Theatre.find({ isActive: true })
  .sort({ createdAt: -1 });
    res.json(theatres);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch theatres" });
  }
};

// ✏️ UPDATE THEATRE
export const updateTheatre = async (req, res) => {
  const { id } = req.params;
  const { name, city, screens } = req.body;

  const theatre = await Theatre.findById(id);
  if (!theatre) {
    return res.status(404).json({ message: "Theatre not found" });
  }

  if (name) theatre.name = name;
  if (city) theatre.city = city;
  if (screens) theatre.screens = screens;

  await theatre.save();
  res.json(theatre);
};

// 🗑️ SOFT DELETE THEATRE
export const deleteTheatre = async (req, res) => {
  const { id } = req.params;

  const theatre = await Theatre.findById(id);
  if (!theatre) {
    return res.status(404).json({ message: "Theatre not found" });
  }

  theatre.isActive = false;
  await theatre.save();

  res.json({ message: "Theatre deactivated" });
};
