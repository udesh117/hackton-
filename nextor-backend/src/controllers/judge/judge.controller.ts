import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { getAssignedTeams, getJudgeDashboardSummary, getSubmissionForEvaluation, saveEvaluationDraft, getAssignmentId, getEvaluationByTeamId, submitFinalEvaluation, updateSubmittedEvaluation, getMyReviews } from "../../services/judge/judge.service";
import { validateScoreRanges } from "../../utils/evaluation.validation";
import { aggregateJudgeScores } from "../../services/admin/admin.service";

// GET /api/judge/assignments (Get Assigned Teams List)

export const getAssignedTeamsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;
        
        // 1. Pagination and Filtering logic (UNCOMMENTED AND EXTRACTED)
        // Default page is 1, default limit is 10.
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        // 2. Call Service with Pagination Parameters
        // The service MUST return both the paged teams and the total count.
        const { teams, totalCount } = await getAssignedTeams(judgeId, page, limit);
 
        // 3. Calculate Pagination Metadata
        const totalPages = Math.ceil(totalCount / limit);

        // 4. Return Response with Metadata
        return res.status(200).json({
            message: "Assigned teams retrieved successfully.",
            teams: teams,
            pagination: {
                totalItems: totalCount,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit,
            }
        });

    } catch (error: any) {
        console.error("Controller Error [getAssignedTeamsController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ------------------------------------------------------------------
// GET /api/judge/dashboard (Get Judge Dashboard Summary)
// ------------------------------------------------------------------
export const getJudgeDashboardController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;

        // 1. Call Service to get counts
        const summary = await getJudgeDashboardSummary(judgeId);

        // 2. Return Response
        return res.status(200).json({
            message: "Dashboard summary retrieved.",
            dashboard: {
                assignedTeamsCount: summary.totalAssigned,
                evaluationProgress: {
                    completed: summary.completedCount,
                    pending: summary.pendingCount,
                    readyForEvaluation: summary.readyForEvaluationCount
                },
                // announcementsSummary: summary.announcementsSummary // Uncomment when Notification service is linked
            }
        });

    } catch (error: any) {
        console.error("Controller Error [getJudgeDashboardController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/judge/submission/:teamId (Fetch Submission Details)

export const getSubmissionForEvaluationController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;
        const teamId = req.params.teamId;

        if (!teamId) {
            return res.status(400).json({ message: "Team ID is required." });
        }
        
        // 1. Call Service (Performs assignment check and data fetch)
        const submission = await getSubmissionForEvaluation(judgeId, teamId);

        if (!submission) {
             return res.status(404).json({ message: "No final submission found for this team." });
        }

        // 2. Return Response
        return res.status(200).json({
            message: "Submission details retrieved.",
            submission: submission
        });

    } catch (error: any) {
        // Map the security error from the service to a 403 Forbidden
        if (error.message.includes("Forbidden")) {
            return res.status(403).json({ message: error.message });
        }
        console.error("Controller Error [getSubmissionForEvaluationController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// POST /api/judge/evaluation/:teamId/draft (Save Evaluation Draft)
// ------------------------------------------------------------------
export const saveEvaluationDraftController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;
        const teamId = req.params.teamId;
        const payload = req.body;

        if (!teamId) {
            return res.status(400).json({ message: "Team ID is required." });
        }
        
        // 1. Security Check: Verify Assignment & Get Submission ID
        // Reuse getSubmissionForEvaluation service logic to perform assignment check (403 error)
        const submission = await getSubmissionForEvaluation(judgeId, teamId);
        
        if (!submission || submission.status !== 'submitted') {
            return res.status(400).json({ message: "Cannot draft evaluation: Team has not submitted a final project." });
        }

        // **NEW LOGIC: Fetch the required assignment_id**
        const assignmentId = await getAssignmentId(judgeId, teamId); // <-- NEW CALL

        if (!assignmentId) {
             // This should be caught by getSubmissionForEvaluation, but acts as a safeguard
             return res.status(403).json({ message: "Assignment not found for this judge and team." });
        }

        // 2. Data Validation: validateScoreRanges middleware handles range checks

        // 3. Call Service
        const savedDraft = await saveEvaluationDraft(judgeId, teamId, submission.id, assignmentId, payload);

        return res.status(200).json({
            message: "Evaluation draft saved successfully.",
            evaluation: savedDraft
        });

    } catch (error: any) {
        if (error.message.includes("Forbidden")) {
            return res.status(403).json({ message: error.message });
        }
        console.error("Controller Error [saveEvaluationDraftController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// GET /api/judge/evaluation/:teamId (Retrieve Saved/In-Progress Draft)
export const getEvaluationDraftController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;
        const teamId = req.params.teamId;
        
        // This implicitly performs an assignment check by only querying the judge's record.
        const evaluation = await getEvaluationByTeamId(judgeId, teamId);

        if (!evaluation) {
            // Return an empty template if no record exists
            return res.status(200).json({ 
                message: "No draft found. Returning empty template.",
                evaluation: {
                    status: 'none',
                    is_locked_by_admin: false,
                    scores: { /* scores will be null */ },
                    comments: ""
                }
            });
        }
        
        return res.status(200).json({
            message: "Evaluation draft retrieved.",
            evaluation: evaluation
        });

    } catch (error: any) {
        console.error("Controller Error [getEvaluationDraftController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/judge/evaluation/:teamId/status (Get Evaluation Status Only)
export const getEvaluationStatusController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;
        const teamId = req.params.teamId;
        
        const evaluation = await getEvaluationByTeamId(judgeId, teamId);

        const status = evaluation ? evaluation.status : 'none';
        const isLocked = evaluation ? evaluation.is_locked_by_admin : false;

        return res.status(200).json({
            message: "Evaluation status retrieved.",
            status: status, // 'none', 'draft', 'submitted', 'locked'
            isLocked: isLocked
        });

    } catch (error: any) {
        console.error("Controller Error [getEvaluationStatusController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// POST /api/judge/evaluation/:teamId/submit (Submit Final Evaluation)
export const submitFinalEvaluationController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;
        const teamId = req.params.teamId;
        const payload = req.body;

        if (!teamId) {
            return res.status(400).json({ message: "Team ID is required." });
        }
        
        // 1. Security Check: Verify Assignment & Get Submission ID
        // This reuse ensures assignment is checked and team has submitted.
        const submission = await getSubmissionForEvaluation(judgeId, teamId);
        
        if (!submission || submission.status !== 'submitted') {
            return res.status(400).json({ message: "Cannot submit: Team has not submitted a final project." });
        }
        
        // 2. Lock Check: Ensure evaluation is not already submitted (Idempotency check)
        // Although the service performs an update, we should prevent multiple submissions.
        const existingEvaluation = await getEvaluationByTeamId(judgeId, teamId);
        if (existingEvaluation && existingEvaluation.status === 'submitted') {
             return res.status(400).json({ message: "Evaluation has already been submitted for this team." });
        }

        // 3. Data Validation: validateScoreRanges middleware handles range checks and required comments
        
        // 4. Call Service to finalize submission
        const finalEvaluation = await submitFinalEvaluation(judgeId, teamId, submission.id, payload);

        // Trigger aggregation so leaderboards update in near-real-time.
        try {
            await aggregateJudgeScores();
        } catch (aggErr: any) {
            console.error("Aggregation Error [submitFinalEvaluationController]:", aggErr?.message || aggErr);
            // Do not fail the submission if aggregation fails; it's a best-effort background step.
        }

        return res.status(200).json({
            message: "Evaluation submitted successfully. Thank you for your review!",
            evaluation: finalEvaluation
        });

    } catch (error: any) {
        if (error.message.includes("Forbidden")) {
            return res.status(403).json({ message: error.message });
        }
        console.error("Controller Error [submitFinalEvaluationController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// PATCH /api/judge/evaluation/:teamId/update (Update Submitted Evaluation)
export const updateSubmittedEvaluationController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;
        const teamId = req.params.teamId;
        const payload = req.body;

        if (!teamId) {
            return res.status(400).json({ message: "Team ID is required." });
        }
        
        // 1. Check if the evaluation is submitted and NOT locked
        const existingEvaluation = await getEvaluationByTeamId(judgeId, teamId);
        
        if (!existingEvaluation || existingEvaluation.status !== 'submitted') {
            return res.status(400).json({ message: "Only submitted evaluations can be updated." });
        }

        if (existingEvaluation.is_locked_by_admin) {
             return res.status(423).json({ message: "Forbidden. Evaluation is locked by an Administrator." }); // 423 Locked
        }

        // 2. Data Validation: Re-use validation middleware (scores and comments must be present and valid)
        // Note: We skip submission check here as the update is only for scores/comments.
        
        // 3. Call Service
        const updatedEvaluation = await updateSubmittedEvaluation(judgeId, teamId, payload);

        return res.status(200).json({
            message: "Submitted evaluation updated successfully.",
            evaluation: updatedEvaluation
        });

    } catch (error: any) {
        if (error.message.includes("Evaluation may be locked by an Administrator")) {
             return res.status(423).json({ message: error.message });
        }
        console.error("Controller Error [updateSubmittedEvaluationController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// GET /api/judge/my-reviews (List Completed and Draft Reviews)
export const getMyReviewsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.user!.id;

        // 1. Call Service
        const reviews = await getMyReviews(judgeId);

        // 2. Return Response
        return res.status(200).json({
            message: "Judge reviews list retrieved successfully.",
            reviews: reviews,
            totalCount: reviews.length
        });

    } catch (error: any) {
        console.error("Controller Error [getMyReviewsController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};