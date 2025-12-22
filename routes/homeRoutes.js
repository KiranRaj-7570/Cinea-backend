import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  getTrending,
  sinceYouBooked,
  reviewedByFriends,
  yourActivity,
  getBookedRecommendations,
  getFirstCityForMovie,
  globalReviews,getWatchlistIds,
} from "../controllers/homeController.js";

const router = express.Router();

router.get("/trending", getTrending);
router.get("/since-booked", verifyToken, sinceYouBooked);
router.get("/reviewed-by-friends", verifyToken, reviewedByFriends);
router.get("/your-activity", verifyToken, yourActivity);
router.get("/booked", verifyToken, getBookedRecommendations);
router.get("/shows/movie/:movieId/first-city",verifyToken, getFirstCityForMovie);
router.get("/global-reviews",verifyToken, globalReviews);
router.get("/watchlist/ids",verifyToken, getWatchlistIds);

export default router;
