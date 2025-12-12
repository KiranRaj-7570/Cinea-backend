import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const TMDB_BASE = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

// Fetch helper
const fetchTMDB = async (url, params = {}) => {
  const { data } = await axios.get(url, {
    params: { api_key: API_KEY, language: "en-US", ...params },
  });
  return data;
};

// Transform movie → unified format
const mapMovie = (item) => ({
  id: item.id,
  title: item.title,
  media_type: "movie",
  poster_path: item.poster_path,
  vote_average: item.vote_average,
  popularity: item.popularity,
  release_date: item.release_date,
});



// 🔎 SEARCH (movies only — for SEARCH PAGE)
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ results: [] });

    const data = await fetchTMDB(`${TMDB_BASE}/search/movie`, {
      query,
      include_adult: false,
    });

    // Filter movies WITHOUT posters
    const results = (data.results || [])
      .filter((m) => m.poster_path)
      .map(mapMovie);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ msg: "Movie search failed", error: err.message });
  }
});


// 🎬 EXPLORE: Trending Movies (poster only)
router.get("/trending", async (req, res) => {
  try {
    const data = await fetchTMDB(`${TMDB_BASE}/trending/movie/week`);
    const results = (data.results || [])
      .filter((m) => m.poster_path)
      .map(mapMovie);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch trending movies" });
  }
});


// 🎬 EXPLORE: Popular Movies
router.get("/popular", async (req, res) => {
  try {
    const data = await fetchTMDB(`${TMDB_BASE}/movie/popular`);
    const results = data.results
      .filter((m) => m.poster_path)
      .map(mapMovie);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch popular movies" });
  }
});


// 🎬 EXPLORE: Top Rated Movies
router.get("/top-rated", async (req, res) => {
  try {
    const data = await fetchTMDB(`${TMDB_BASE}/movie/top_rated`);
    const results = data.results
      .filter((m) => m.poster_path)
      .map(mapMovie);

    res.json({ results });
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch top-rated movies" });
  }
});

router.get("/details/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await fetchTMDB(`${TMDB_BASE}/movie/${id}`, {
      append_to_response: "videos,credits,images,recommendations",
    });

    res.json(data);
  } catch (err) {
    console.error("Movie details error:", err.message);
    res.status(500).json({
      msg: "Failed to fetch movie details",
      error: err.message,
    });
  }
});

router.get("/similar/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await fetchTMDB(`${TMDB_BASE}/movie/${id}/similar`);
    const results = (data.results || [])
      .filter((m) => m.poster_path)
      .map(mapMovie);

    res.json({ results });
  } catch (err) {
    console.error("Similar movies error:", err.message);
    res.status(500).json({ msg: "Failed to fetch similar movies" });
  }
});

export default router;