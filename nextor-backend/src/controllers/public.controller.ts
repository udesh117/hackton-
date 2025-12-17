import { Request, Response } from "express";
import { getInternalLeaderboard } from "../services/admin/admin.service"; // Reuse service function

// ------------------------------------------------------------------
// GET /api/public/leaderboard (Public, Unauthenticated Endpoint)
// ------------------------------------------------------------------

export const getPublicLeaderboardController = async (req: Request, res: Response): Promise<any> => {
    try {
        // --- PUBLIC ENDPOINT HARDENING ---
        // 1. Set defaults for public use (prevents DOS via large requests)
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50; // Max 50 per page for public
        
        // 2. Allow limited public filters (e.g., by category, not team name)
        const filters = {
            category: req.query.category as string,
            // DO NOT expose teamName filtering for public view unless necessary
        };
        
        // 3. CRITICAL: Pass true for isPublishedFilter
        const result = await getInternalLeaderboard(page, limit, filters, true); 

        // Public endpoint returns the array directly, no need for totalCount/page metadata
        return res.status(200).json(result.leaderboard);

    } catch (error: any) {
        console.error("Controller Error [getPublicLeaderboardController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};