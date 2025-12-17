import { Router } from "express";
import { getAssignedTeamsController, 
        getJudgeDashboardController, 
        getSubmissionForEvaluationController, 
        saveEvaluationDraftController, 
        getEvaluationDraftController, 
        getEvaluationStatusController, 
        submitFinalEvaluationController, 
        updateSubmittedEvaluationController,
        getMyReviewsController } from "../../controllers/judge/judge.controller";
import { verifyAuthToken } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/roleMiddleware";
import { validateScoreRanges } from "../../utils/evaluation.validation";

const router = Router();

// All judge routes must be authenticated and require the 'judge' role
router.use(verifyAuthToken);
router.use(requireRole(["judge"]));

// 1. GET /api/judge/assignments (Get Assigned Teams)
router.get("/assignments", getAssignedTeamsController);

// 2. GET /api/judge/dashboard (Judge Dashboard)
router.get("/dashboard", getJudgeDashboardController);

// 3. GET /api/judge/submission/:teamId (Get Submission for Evaluation)
router.get("/submission/:teamId", getSubmissionForEvaluationController);

// Evaluation Routes
// 4. POST /api/judge/evaluation/:teamId/draft (Save Evaluation Draft)
router.post("/evaluation/:teamId/draft", validateScoreRanges, saveEvaluationDraftController);

// 5. GET /api/judge/evaluation/:teamId (Retrieve Saved/In-Progress Draft)
router.get("/evaluation/:teamId", getEvaluationDraftController);

// 6. GET /api/judge/evaluation/:teamId/status (Get Evaluation Status Only)
router.get("/evaluation/:teamId/status", getEvaluationStatusController);

// 7. POST /api/judge/evaluation/:teamId/submit (Submit Final Evaluation)
router.post("/evaluation/:teamId/submit", validateScoreRanges, submitFinalEvaluationController);

// 8. PATCH /api/judge/evaluation/:teamId/update (Update Submitted Evaluation)
// Uses the same validation rules as submit (scores/comments must be valid)
router.patch("/evaluation/:teamId/update", validateScoreRanges, updateSubmittedEvaluationController);

// 9. GET /api/judge/my-reviews (List Completed and Draft Reviews)
router.get("/my-reviews", getMyReviewsController);

export default router;