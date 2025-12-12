import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

const fetchTMDB = async (url, params = {}) => {
  const { data } = await axios.get(url, {
    params: { api_key: API_KEY, language: "en-US", ...params },
  });
  return data;
};

// Transform TV show → unified format
const mapShow = (item) => ({
  id: item.id,
  name: item.name,
  media_type: "tv",
  poster_path: item.poster_path,
  backdrop_path: item.backdrop_path,
  vote_average: item.vote_average,
  popularity: item.popularity,
  first_air_date: item.first_air_date,
});


// 🔎 SEARCH (series only — used together with movies in search page)
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ results: [] });

    const data = await fetchTMDB(`${TMDB_BASE}/search/tv`, {
      query,
      include_adult: false,
    });

    // Filter shows WITHOUT posters → for search page consistency
    const results = (data.results || [])
      .filter((s) => s.poster_path)
      .map(mapShow);

    res.json({ results });
  } catch (err) {
    res.status(500).json({
      msg: "TV search failed",
      error: err.message,
    });
  }
});


// 📺 EXPLORE: Trending TV (backdrop only)
router.get("/trending", async (req, res) => {
  try {
    const data = await fetchTMDB(`${TMDB_BASE}/trending/tv/week`);

    const results = (data.results || [])
      .filter((s) => s.backdrop_path) // horizontal only
      .map(mapShow);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch trending TV shows" });
  }
});


// 📺 EXPLORE: Popular TV
router.get("/popular", async (req, res) => {
  try {
    const data = await fetchTMDB(`${TMDB_BASE}/tv/popular`);

    const results = data.results
      .filter((s) => s.backdrop_path)
      .map(mapShow);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch popular TV shows" });
  }
});


// 📺 EXPLORE: Top Rated TV
router.get("/top-rated", async (req, res) => {
  try {
    const data = await fetchTMDB(`${TMDB_BASE}/tv/top_rated`);

    const results = data.results
      .filter((s) => s.backdrop_path)
      .map(mapShow);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch top-rated TV shows" });
  }
});

router.get("/details/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await fetchTMDB(`${TMDB_BASE}/tv/${id}`, {
      append_to_response: "videos,credits,images,recommendations",
    });

    res.json(data);
  } catch (err) {
    console.error("TV details error:", err.message);
    res.status(500).json({
      msg: "Failed to fetch TV details",
      error: err.message,
    });
  }
});

router.get("/similar/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await fetchTMDB(`${TMDB_BASE}/tv/${id}/similar`);
    const results = (data.results || [])
      .filter((s) => s.backdrop_path)
      .map(mapShow);

    res.json({ results });
  } catch (err) {
    console.error("Similar TV error:", err.message);
    res.status(500).json({ msg: "Failed to fetch similar TV shows" });
  }
});

router.get("/:id/season/:seasonNumber", async (req, res) => {
  try {
    const { id, seasonNumber } = req.params;

    const data = await fetchTMDB(`${TMDB_BASE}/tv/${id}/season/${seasonNumber}`);

    res.json(data);
  } catch (err) {
    console.error("Fetch season error:", err.message);
    res.status(500).json({ msg: "Failed to fetch season episodes" });
  }
});

export default router;