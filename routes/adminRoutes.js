import express from "express";
import { getAdminKpis } from "../controllers/adminKpiController.js";
import { isAdmin } from "../middleware/adminMiddleware.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getAdminCharts } from "../controllers/adminChartController.js";

const router = express.Router();

router.get("/kpis", verifyToken, isAdmin, getAdminKpis);
router.get("/charts/overview", verifyToken, isAdmin, getAdminCharts);

export default router;
