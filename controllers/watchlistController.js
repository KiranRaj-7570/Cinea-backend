import Watchlist from "../models/Watchlist.js";
import TvProgress from "../models/TvProgress.js";


export const addToWatchlist = async (req, res) => {
  try {
    const { tmdbId, mediaType, title, poster, backdrop } = req.body;
    const userId = req.user.id;

    const payload = { userId, tmdbId, mediaType, title, poster, backdrop };
    const item = new Watchlist(payload);
    await item.save();

    return res.status(201).json({ message: "Added to watchlist", item });
  } catch (err) {
  
    if (err.code === 11000) {
      return res.status(200).json({ message: "Already in watchlist" });
    }
    console.error("Watchlist add error:", err);
    return res.status(500).json({ message: "Failed to add to watchlist" });
  }
};

export const removeFromWatchlist = async (req, res) => {
  try {
    const { tmdbId, mediaType } = req.params;
    const userId = req.user.id;

    const deleted = await Watchlist.findOneAndDelete({ userId, tmdbId: Number(tmdbId), mediaType });
    if (!deleted) return res.status(404).json({ message: "Not found in watchlist" });

    await TvProgress.deleteOne({ userId, tmdbId: Number(tmdbId) });

    return res.json({ message: "Removed from watchlist and cleared progress" });
  } catch (err) {
    console.error("Watchlist remove error:", err);
    return res.status(500).json({ message: "Failed to remove from watchlist" });
  }
};

export const getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await Watchlist.find({ userId }).sort({ addedAt: -1 }).lean();
    return res.json({ items: list });
  } catch (err) {
    console.error("Get watchlist error:", err);
    return res.status(500).json({ message: "Failed to fetch watchlist" });
  }
};
