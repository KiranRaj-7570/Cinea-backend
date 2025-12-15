import express from "express";
import {
  createShow,
  getAllShows,
} from "../controllers/adminShowController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/shows", verifyToken, isAdmin, createShow);
router.get("/shows", verifyToken, isAdmin, getAllShows);

export default router;
