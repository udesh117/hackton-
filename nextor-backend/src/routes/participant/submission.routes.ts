import { Router } from "express";
import { handleSubmissionDraft, finalizeSubmission, uploadMiddleware, updateSubmissionDetailsController, getSubmissionDetails } from "../../controllers/participant/submission.controller";
import { verifyAuthToken } from "../../middlewares/authMiddleware";
import { requireRole } from "../../middlewares/roleMiddleware";


const router = Router();

// Apply base security: must be logged in and must be a participant
router.use(verifyAuthToken);
router.use(requireRole(["participant"]));

// Create/Update Draft
router.post("/", uploadMiddleware, handleSubmissionDraft);

// Finalize Submission
router.put("/:id/finalize", finalizeSubmission);

// GET and PATCH routes need to be accessible to Admins/Judges as well as Participants
router.get("/:id", verifyAuthToken, getSubmissionDetails);
router.patch("/:id", verifyAuthToken, updateSubmissionDetailsController); // PATCH /api/submissions/:id

export default router;