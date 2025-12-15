import express from "express";
import {
  searchTV,
  getTrendingTV,
  getPopularTV,
  getTopRatedTV,
  getTVDetails,
  getSimilarTV,
  getSeasonEpisodes,
} from "../controllers/tvController.js";

const router = express.Router();

router.get("/search", searchTV);
router.get("/trending", getTrendingTV);
router.get("/popular", getPopularTV);
router.get("/top-rated", getTopRatedTV);
router.get("/details/:id", getTVDetails);
router.get("/similar/:id", getSimilarTV);
router.get("/:id/season/:seasonNumber", getSeasonEpisodes);

export default router;
