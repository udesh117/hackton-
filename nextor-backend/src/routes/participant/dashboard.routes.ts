import { Router } from "express";
import { getParticipantDashboardController } from "../../controllers/participant/dashboard.controller";
import { verifyAuthToken } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/roleMiddleware";

const router = Router();

// GET /api/participant/dashboard
router.get("/dashboard", verifyAuthToken, requireRole(["participant"]), getParticipantDashboardController);

export default router;