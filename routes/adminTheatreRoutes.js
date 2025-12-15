import express from "express";
import {
  createTheatre,
  getAllTheatres,
} from "../controllers/adminTheatreController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/theatres", verifyToken, isAdmin, createTheatre);
router.get("/theatres", verifyToken, isAdmin, getAllTheatres);

export default router;
