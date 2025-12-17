import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { createSubmission, updateSubmissionDetails, getSubmissionById } from "../../services/participant/submission.service";
import { supabase } from "../../lib/supabaseClient";
import multer from "multer";
import { FileService } from "../../services/file.service";
import { getExtension } from "../../utils/file.util";
import { isDeadlinePassed } from "../../utils/deadline.util";

// --- MULTER SETUP ---
// Multer configuration for in-memory storage (allowing us to get the buffer for AV scan)
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10MB
}).single('zipFile'); // Assuming the frontend field name is 'zipFile'


const getTeamMembershipDetails = async (userId: string): Promise<{ teamId: string, leaderId: string } | null> => {
    // 1. Find the team the user belongs to
    const { data: membership } = await supabase
        .from("TeamMembers")
        .select("team_id")
        .eq("user_id", userId)
        .maybeSingle();
    
    if (!membership) return null;

    // 2. Get the Leader ID for that team
    const { data: team } = await supabase
        .from("Teams")
        .select("leader_id")
        .eq("id", membership.team_id)
        .maybeSingle();
        
    if (!team) return null;

    return { 
        teamId: membership.team_id, 
        leaderId: team.leader_id 
    };
};

// moved getExtension to src/utils/file.util.ts and imported above

// 1. POST /api/submissions (Create/Update Draft)
export const handleSubmissionDraft = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const { title, description, repoUrl } = req.body;
        const file = (req as any).file as Express.Multer.File | undefined; // Multer attached file

        // --- NEW: Wall-Clock Deadline Check ---
        if (await isDeadlinePassed()) {
            return res.status(403).json({ 
                message: "Action forbidden. The submission deadline has passed, and new drafts cannot be created or updated." 
            });
        }

        // A. Security Check: Use the consolidated helper
        const details = await getTeamMembershipDetails(userId); // returns { teamId: string, leaderId: string }
        
        if (!details) {
            return res.status(403).json({ message: "Forbidden. You must belong to a team to create a submission." });
        }
        
        if (!title) {
            return res.status(400).json({ message: "Project title is required." });
        }

        let zipStoragePath: string | undefined;

        if (file) {
            // A. File Validation (Adapted from Accrefin)
            const ext = getExtension(file.originalname);
            // Allow .zip files for submission (update if needed)
            if (ext.toLowerCase() !== '.zip') { 
                 return res.status(400).json({ message: "Invalid file type. Only .zip archives are permitted." });
            }
            
            // B. CALL FILE SERVICE FOR SCAN AND UPLOAD
            const filename = `${details.teamId}-${Date.now()}${ext}`; // Build unique filename
            
            // The service handles the AV scan, then the S3 upload
            const fileUrl = await FileService.uploadSubmissionZip(details.teamId, filename, file.buffer, file.mimetype);

            // The file service returns the path/URL
            zipStoragePath = fileUrl; 
        }

        // B. Call Service - Accessing the teamId string property
        const submissionData = {
            teamId: details.teamId, // <-- FIXED: Accessing the string property
            title,
            description,
            repoUrl,
            zipStoragePath 
        };

        const submission = await createSubmission(submissionData);

        return res.status(201).json({ 
            message: "Submission draft saved successfully.", 
            submission 
        });

    } catch (error: any) {
        // Handle specific errors from file service (AV or Upload failure)
           if (error.message.includes("FileService: buffer flagged as infected")) {
             return res.status(403).json({ message: "Upload failed: Security risk detected (Virus).", code: "VIRUS_DETECTED" });
        }
           if (error.message.includes("Upload failed")) {
             return res.status(500).json({ message: "File upload failed due to cloud storage error.", code: "STORAGE_FAILURE" });
        }
        
        console.error("Submission Draft Error:", error.message);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// 2. PUT /api/submissions/:id/finalize (Lock Submission)

export const finalizeSubmission = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const submissionId = req.params.id;

        // A. Security Check: Find team and verify ownership / role
        const details = await getTeamMembershipDetails(userId);
        
        if (!details) {
            return res.status(403).json({ message: "Forbidden. You must belong to a team to finalize submissions." });
        }
        
        // --- CRITICAL CHECK: ONLY LEADER CAN SUBMIT ---
        if (userId !== details.leaderId) {
            return res.status(403).json({ message: "Forbidden. Only the Team Leader can finalize the submission." });
        }
        // ---------------------------------------------
        
        // B. Update the submission status and record submitted_at time
        const { data: updatedSubmission, error: updateError } = await supabase
            .from("Submissions")
            .update({
                status: 'submitted',
                submitted_at: new Date().toISOString()
            })
            .eq("id", submissionId)
            .eq("team_id", details.teamId) // Ensure submission belongs to the user's team
            .select()
            .single();

        if (updateError || !updatedSubmission) {
            return res.status(404).json({ message: "Submission not found or you do not have permission to finalize it." });
        }

        return res.status(200).json({
            message: "Submission finalized!",
            submission: updatedSubmission
        });

    } catch (error: any) {
        console.error("Submission Finalize Error:", error.message);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 3. GET /api/submissions/:id (Get Submission Details)
export const getSubmissionDetails = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const submissionId = req.params.id;

        // Security check: Ensure user is either Admin/Judge OR a member of the team
        const details = await getTeamMembershipDetails(req.user!.id);
        const isAdminOrJudge = req.user!.role !== 'participant';

        if (!isAdminOrJudge && (!details || !details.teamId)) {
            return res.status(403).json({ message: "Forbidden. You must be an admin, judge, or team member." });
        }
        
        const submission = await getSubmissionById(submissionId);

        if (!submission) {
            return res.status(404).json({ message: "Submission not found." });
        }
        
        // Final security check for participants: Must be their team
        if (!isAdminOrJudge && submission.team_id !== details!.teamId) {
             return res.status(403).json({ message: "Forbidden. You can only view your own team's submission." });
        }
        
        return res.status(200).json({ submission });

    } catch (error: any) {
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// 4. PATCH /api/submissions/:id (Update Submission Details)

export const updateSubmissionDetailsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const submissionId = req.params.id;
        const updates = req.body; // Contains title, description, repoUrl, etc.

        if (await isDeadlinePassed()) {
            return res.status(403).json({ 
                message: "Action forbidden. The submission deadline has passed, and submission details cannot be changed." 
            });
        }
        
        // A. Security Check: Only Team Leaders can update submissions
        const details = await getTeamMembershipDetails(userId);
        
        if (!details || userId !== details.leaderId) {
            return res.status(403).json({ message: "Forbidden. Only the Team Leader can update submission details." });
        }

        // B. Check Submission Status: Cannot edit finalized submissions
        const { data: currentSubmission } = await supabase
            .from("Submissions")
            .select("status")
            .eq("id", submissionId)
            .single();

        if (currentSubmission?.status === 'submitted') {
            return res.status(403).json({ message: "Cannot edit a finalized submission." });
        }
        
        // C. Call Service
        const updatedSubmission = await updateSubmissionDetails(submissionId, details.teamId, updates);

        return res.status(200).json({ 
            message: "Submission updated successfully.", 
            submission: updatedSubmission 
        });

    } catch (error: any) {
        if (error.message.includes("Submission not found")) {
            return res.status(404).json({ message: "Submission not found or permission denied." });
        }
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};