import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getProfileStats } from "../controllers/profileController.js";

const router = express.Router();

router.get("/stats", verifyToken, getProfileStats);
router.get("/stats/:userId", verifyToken, getProfileStats); // 🔥 add this


export default router;