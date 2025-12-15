import express from "express";
import {
  searchMovies,
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getMovieDetails,
  getSimilarMovies,
} from "../controllers/movieController.js";

const router = express.Router();

router.get("/search", searchMovies);
router.get("/trending", getTrendingMovies);
router.get("/popular", getPopularMovies);
router.get("/top-rated", getTopRatedMovies);
router.get("/details/:id", getMovieDetails);
router.get("/similar/:id", getSimilarMovies);

export default router;
