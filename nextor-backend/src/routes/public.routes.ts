import { Router } from "express";
import { getPublicLeaderboardController } from "../controllers/public.controller";

const router = Router();

// This route uses NO authentication middleware.

// 1. GET /api/public/leaderboard (Get Published Leaderboard)
router.get("/leaderboard", getPublicLeaderboardController); 

export default router;