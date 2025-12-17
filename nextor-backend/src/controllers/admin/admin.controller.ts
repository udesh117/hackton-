import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { 
    createJudgeAccount, 
    getJudgesList, 
    updateJudgeAccount,
    deleteJudgeAccount,
    getTeamsListAdmin,
    getTeamProfileAdmin,
    updateTeamAdmin, 
    verifyTeamAdmin,
    getJudgeAssignments,
    assignTeamsToJudges,
    reassignTeam,
    autoBalanceAssignments,
    getSubmissionsPanel,
    getSubmissionDetailAdmin,
    changeSubmissionStatus,
    generateSubmissionDownloadUrl,
    aggregateJudgeScores,
    computeFinalLeaderboard,
    getInternalLeaderboard,
    publishLeaderboardToggle,
    createAnnouncement,
    sendAnnouncementNow,
    scheduleAnnouncement,
    getAnnouncementsList,
    getAnalyticsOverview,
    getAnalyticsDetail,
    getStateCollegeBreakdown,
    getAuditLogs,
    getPlatformSettings,
    updatePlatformSettings,
    exportTeamsData

} from "../../services/admin/admin.service";

// ------------------------------------------------------------------
// POST /api/admin/judge (Create Judge Account)
// ------------------------------------------------------------------
export const createJudgeController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { email, firstName, lastName } = req.body;
        
        if (!email || !firstName || !lastName) {
            return res.status(400).json({ message: "Email, first name, and last name are required." });
        }

        const newJudge = await createJudgeAccount(email, firstName, lastName); // [cite: 46]

        return res.status(201).json({
            message: "Judge account created successfully. Admin should follow up with a password reset link.",
            judge: newJudge
        });

    } catch (error: any) {
        console.error("Controller Error [createJudgeController]:", error.message);
        // Handle unique constraint error from service
        if (error.message.includes("already exists")) {
            return res.status(409).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error" });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/judges (Get Judges List)
// ------------------------------------------------------------------
export const getJudgesListController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        const { judges, totalCount } = await getJudgesList(page, limit); // [cite: 38]

        return res.status(200).json({
            message: "Judges list retrieved successfully.",
            judges: judges,
            page,
            limit,
            totalCount
        });

    } catch (error: any) {
        console.error("Controller Error [getJudgesListController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ------------------------------------------------------------------
// PATCH /api/admin/judge/:judgeId (Update Judge Account)
// ------------------------------------------------------------------
export const updateJudgeController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.params.judgeId;
        const payload = req.body;
        
        if (!judgeId) {
             return res.status(400).json({ message: "Judge ID is required for update." });
        }
        
        const updatedJudge = await updateJudgeAccount(judgeId, payload); // [cite: 49]

        return res.status(200).json({
            message: "Judge account updated successfully.",
            judge: updatedJudge
        });

    } catch (error: any) {
        console.error("Controller Error [updateJudgeController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// DELETE /api/admin/judge/:judgeId (Delete/Deactivate Judge Account)
// ------------------------------------------------------------------
export const deleteJudgeController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const judgeId = req.params.judgeId;
        // Determine delete type: soft delete is preferred. Default to soft.
        const type = (req.query.type as string)?.toLowerCase() === 'hard' ? 'hard' : 'soft';
        
        if (!judgeId) {
             return res.status(400).json({ message: "Judge ID is required for deletion." });
        }
        
        const result = await deleteJudgeAccount(judgeId, type as 'soft' | 'hard'); // [cite: 54, 56]

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("Controller Error [deleteJudgeController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// --- TEAM MANAGEMENT CONTROLLERS ---

// ------------------------------------------------------------------
// GET /api/admin/teams (Get Teams List)
// ------------------------------------------------------------------
export const getTeamsListController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const filters = { status: req.query.status as string };
        const search = req.query.search as string || '';
        
        const { teams, totalCount } = await getTeamsListAdmin(page, limit, filters, search); //

        return res.status(200).json({
            message: "Teams list retrieved successfully.",
            teams: teams,
            page,
            limit,
            totalCount
        });

    } catch (error: any) {
        console.error("Controller Error [getTeamsListController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/team/:teamId (Get Team Profile)
// ------------------------------------------------------------------
export const getTeamProfileAdminController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const teamId = req.params.teamId;
        
        if (!teamId) {
             return res.status(400).json({ message: "Team ID is required." });
        }
        
        const teamProfile = await getTeamProfileAdmin(teamId); //

        if (!teamProfile) {
            return res.status(404).json({ message: "Team not found." });
        }

        return res.status(200).json({
            message: "Team profile retrieved successfully.",
            team: teamProfile
        });

    } catch (error: any) {
        console.error("Controller Error [getTeamProfileAdminController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// PATCH /api/admin/team/:teamId (Admin Update Team Details)
// ------------------------------------------------------------------
export const updateTeamAdminController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const teamId = req.params.teamId;
        const payload = req.body;
        
        if (!teamId) {
             return res.status(400).json({ message: "Team ID is required for update." });
        }
        
        const updatedTeam = await updateTeamAdmin(teamId, payload); 

        return res.status(200).json({
            message: "Team details updated successfully by Admin.",
            team: updatedTeam
        });

    } catch (error: any) {
        console.error("Controller Error [updateTeamAdminController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// POST /api/admin/team/:teamId/verify (Admin Verify Team)
// ------------------------------------------------------------------
export const verifyTeamAdminController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const teamId = req.params.teamId;
        const adminId = req.user!.id; // Use authenticated admin ID for logging
        const { action } = req.body; // Expects action: 'approve' or 'reject'
        
        if (!teamId || !action) {
             return res.status(400).json({ message: "Team ID and 'action' (approve/reject) are required." });
        }

        if (action !== 'approve' && action !== 'reject') {
            return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'." });
        }

        const updatedTeam = await verifyTeamAdmin(teamId, action, adminId); 

        return res.status(200).json({
            message: `Team verification status successfully set to ${updatedTeam.verification_status}.`,
            team: updatedTeam
        });

    } catch (error: any) {
        console.error("Controller Error [verifyTeamAdminController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/judge-assignments (Get Assignment Matrix)
// ------------------------------------------------------------------
export const getJudgeAssignmentsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const assignmentMatrix = await getJudgeAssignments(); 

        return res.status(200).json({
            message: "Judge assignment matrix retrieved successfully.",
            assignmentMatrix: assignmentMatrix,
            totalJudges: assignmentMatrix.length
        });

    } catch (error: any) {
        console.error("Controller Error [getJudgeAssignmentsController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// POST /api/admin/assignments/assign (Assign Teams to Judges)
// ------------------------------------------------------------------
export const assignTeamsToJudgesController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const assignments = req.body.assignments; // Expected format: [{ judgeId, teamId }, ...]
        
        if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({ message: "Assignment payload must be a non-empty array of {judgeId, teamId} objects." });
        }
        
        // Basic payload validation
        const isValid = assignments.every(a => a.judgeId && a.teamId);
        if (!isValid) {
            return res.status(400).json({ message: "All assignment objects must contain 'judgeId' and 'teamId'." });
        }
        
        const newAssignments = await assignTeamsToJudges(assignments); 

        return res.status(200).json({
            message: `${newAssignments.length} new assignments created successfully.`,
            assignments: newAssignments
        });

    } catch (error: any) {
        console.error("Controller Error [assignTeamsToJudgesController]:", error.message);
        // Map the assignment conflict error to 409
        if (error.message.includes("conflict")) {
            return res.status(409).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// POST /api/admin/assignments/reassign (Reassign a Single Team)
// ------------------------------------------------------------------
export const reassignTeamController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { teamId, oldJudgeId, newJudgeId } = req.body;
        
        if (!teamId || !oldJudgeId || !newJudgeId) {
            return res.status(400).json({ message: "teamId, oldJudgeId, and newJudgeId are required." });
        }
        
        const result = await reassignTeam(teamId, oldJudgeId, newJudgeId); 

        return res.status(200).json({
            message: `Team ${teamId} successfully reassigned from Judge ${oldJudgeId} to Judge ${newJudgeId}.`,
            assignment: result.newAssignment
        });

    } catch (error: any) {
        console.error("Controller Error [reassignTeamController]:", error.message);
        // Map the conflict error from the internal assignTeamsToJudges call to 409
        if (error.message.includes("conflict")) {
            return res.status(409).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};


// ------------------------------------------------------------------
// POST /api/admin/assignments/auto-balance (Algorithmic Rebalance)
// ------------------------------------------------------------------
export const autoBalanceAssignmentsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        // NOTE: This operation is often guarded by a confirmation modal in the UI
        const result = await autoBalanceAssignments(); 

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("Controller Error [autoBalanceAssignmentsController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// --- SUBMISSIONS MANAGEMENT CONTROLLERS ---

// ------------------------------------------------------------------
// GET /api/admin/submissions (Get Submissions Panel)
// ------------------------------------------------------------------
export const getSubmissionsPanelController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const filters = { status: req.query.status as string };
        
        const { submissions, totalCount } = await getSubmissionsPanel(page, limit, filters); 

        return res.status(200).json({
            message: "Submissions list retrieved successfully.",
            submissions: submissions,
            page,
            limit,
            totalCount
        });

    } catch (error: any) {
        console.error("Controller Error [getSubmissionsPanelController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/submission/:submissionId (Get Submission Detail)
// ------------------------------------------------------------------
export const getSubmissionDetailAdminController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const submissionId = req.params.submissionId;
        
        if (!submissionId) {
             return res.status(400).json({ message: "Submission ID is required." });
        }
        
        const submissionDetail = await getSubmissionDetailAdmin(submissionId); 

        if (!submissionDetail) {
            return res.status(404).json({ message: "Submission not found." });
        }

        return res.status(200).json({
            message: "Submission details retrieved successfully.",
            submission: submissionDetail
        });

    } catch (error: any) {
        console.error("Controller Error [getSubmissionDetailAdminController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};


// ------------------------------------------------------------------
// PATCH /api/admin/submission/:submissionId/status (Change Status)
// ------------------------------------------------------------------
export const changeSubmissionStatusController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const submissionId = req.params.submissionId;
        const { status: newStatus, adminNote } = req.body;
        
        if (!submissionId || !newStatus) {
             return res.status(400).json({ message: "Submission ID and new status are required." });
        }
        
        const updatedSubmission = await changeSubmissionStatus(submissionId, newStatus, adminNote); 

        return res.status(200).json({
            message: `Submission status updated to ${updatedSubmission.status}.`,
            submission: updatedSubmission
        });

    } catch (error: any) {
        console.error("Controller Error [changeSubmissionStatusController]:", error.message);
        // Handle invalid status error
        if (error.message.includes("Invalid status")) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/submission/:submissionId/download (Generate Signed URL)
// ------------------------------------------------------------------
export const downloadSubmissionController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const submissionId = req.params.submissionId;
        
        if (!submissionId) {
             return res.status(400).json({ message: "Submission ID is required." });
        }
        
        const signedUrl = await generateSubmissionDownloadUrl(submissionId); 

        return res.status(200).json({
            message: "Signed download URL generated successfully.",
            downloadUrl: signedUrl
        });

    } catch (error: any) {
        console.error("Controller Error [downloadSubmissionController]:", error.message);
        // Handle file path missing error
        if (error.message.includes("file path is missing")) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// --- SCORING & LEADERBOARD CONTROLLERS ---

// ------------------------------------------------------------------
// POST /api/admin/scores/aggregate (Aggregate Scores)
// ------------------------------------------------------------------
export const aggregateScoresController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const result = await aggregateJudgeScores(); 

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("Controller Error [aggregateScoresController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// POST /api/admin/scores/compute-leaderboard (Compute Final Leaderboard)
// ------------------------------------------------------------------
export const computeLeaderboardController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const result = await computeFinalLeaderboard(); 

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("Controller Error [computeLeaderboardController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// --- LEADERBOARD DISPLAY & CONTROL CONTROLLERS ---

// ------------------------------------------------------------------
// GET /api/admin/leaderboard (Internal View with Pagination)
// ------------------------------------------------------------------
export const getInternalLeaderboardController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        
        // Pass all relevant filters from the query string
        const filters = {
            teamName: req.query.teamName as string,
            category: req.query.category as string,
        };

        const result = await getInternalLeaderboard(page, limit, filters, false); // false for isPublishedFilter

        return res.status(200).json({
            message: "Internal leaderboard retrieved successfully.",
            ...result
        });

    } catch (error: any) {
        console.error("Controller Error [getInternalLeaderboardController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// POST /api/admin/leaderboard/publish (Toggle Publishing Status)
// ------------------------------------------------------------------
export const publishLeaderboardToggleController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { isPublished } = req.body;
        const adminId = req.user?.id;
        
        if (typeof isPublished !== 'boolean') {
             return res.status(400).json({ message: "The 'isPublished' boolean field is required." });
        }
        
        const result = await publishLeaderboardToggle(isPublished, adminId);
        
        return res.status(200).json({
            message: `Leaderboard status successfully set to ${isPublished ? 'PUBLISHED' : 'UNPUBLISHED'}.`,
            isPublished: result.isPublished
        });

    } catch (error: any) {
        console.error("Controller Error [publishLeaderboardToggleController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// --- ANNOUNCEMENTS CONTROLLERS ---

// ------------------------------------------------------------------
// POST /api/admin/announcements (Create Announcement)
// ------------------------------------------------------------------
export const createAnnouncementController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const adminId = req.user?.id;
        if (!adminId) return res.status(401).json({ message: 'Unauthorized' });
        const { title, content, targetCriteria, scheduledAt } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: "Title and content are required." });
        }

        const announcement = await createAnnouncement(adminId, title, content, targetCriteria || {}, scheduledAt);

        return res.status(201).json({
            message: "Announcement created successfully.",
            announcement
        });

    } catch (error: any) {
        console.error("Controller Error [createAnnouncementController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// POST /api/admin/announcements/send (Send Announcement Immediately)
// ------------------------------------------------------------------
export const sendAnnouncementNowController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { announcementId } = req.body;

        if (!announcementId) {
            return res.status(400).json({ message: "Announcement ID is required." });
        }

        const result = await sendAnnouncementNow(announcementId);

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("Controller Error [sendAnnouncementNowController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// --- ANNOUNCEMENTS CONTROLLERS (Continued) ---

// ------------------------------------------------------------------
// POST /api/admin/announcements/schedule (Schedule Announcement)
// ------------------------------------------------------------------
export const scheduleAnnouncementController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const { announcementId, scheduledAt } = req.body;

        if (!announcementId || !scheduledAt) {
            return res.status(400).json({ message: "Announcement ID and scheduled time are required." });
        }

        const result = await scheduleAnnouncement(announcementId, scheduledAt);

        return res.status(200).json({
            message: `Announcement successfully scheduled for ${scheduledAt}.`,
            announcement: result
        });

    } catch (error: any) {
        console.error("Controller Error [scheduleAnnouncementController]:", error.message);
        return res.status(400).json({ message: error.message });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/announcements (List Announcements)
// ------------------------------------------------------------------
export const getAnnouncementsListController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await getAnnouncementsList(page, limit);

        return res.status(200).json({
            message: "Announcements retrieved successfully.",
            ...result
        });

    } catch (error: any) {
        console.error("Controller Error [getAnnouncementsListController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// --- ANALYTICS CONTROLLERS ---

// ------------------------------------------------------------------
// GET /api/admin/analytics/overview
// ------------------------------------------------------------------
export const getAnalyticsOverviewController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const overview = await getAnalyticsOverview();
        return res.status(200).json(overview);
    } catch (error: any) {
        console.error("Controller Error [getAnalyticsOverviewController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/analytics/detail
// ------------------------------------------------------------------
export const getAnalyticsDetailController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        // Filters are passed via query parameters
        const filters = {
            city: req.query.city as string,
            college: req.query.college as string,
            dateRange: {
                start: req.query.start as string,
                end: req.query.end as string,
            }
        };
        const detail = await getAnalyticsDetail(filters);
        return res.status(200).json(detail);
    } catch (error: any) {
        console.error("Controller Error [getAnalyticsDetailController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/overview/breakdown
// ------------------------------------------------------------------
export const getStateCollegeBreakdownController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const breakdown = await getStateCollegeBreakdown();
        return res.status(200).json(breakdown);
    } catch (error: any) {
        console.error("Controller Error [getStateCollegeBreakdownController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
    
};


// --- SETTINGS & AUDIT CONTROLLERS ---

// ------------------------------------------------------------------
// GET /api/admin/settings
// ------------------------------------------------------------------
export const getPlatformSettingsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const settings = await getPlatformSettings();
        return res.status(200).json(settings);
    } catch (error: any) {
        console.error("Controller Error [getPlatformSettingsController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ------------------------------------------------------------------
// PATCH /api/admin/settings
// ------------------------------------------------------------------
export const updatePlatformSettingsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const adminId = req.user?.id;
        if (!adminId) return res.status(401).json({ message: 'Unauthorized' });
        const updates = req.body; // e.g., { "is_registration_open": false }

        // Basic validation: ensure at least one field is provided
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No settings provided to update." });
        }

        const updated = await updatePlatformSettings(adminId, updates);

        return res.status(200).json({
            message: "Settings updated successfully.",
            settings: updated
        });

    } catch (error: any) {
        console.error("Controller Error [updatePlatformSettingsController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/settings/audit-logs
// ------------------------------------------------------------------
export const getAuditLogsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await getAuditLogs(page, limit);

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("Controller Error [getAuditLogsController]:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ------------------------------------------------------------------
// GET /api/admin/teams/export
// ------------------------------------------------------------------
export const exportTeamsCSVController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const filters = req.query; // Filters passed directly from query params

        const exportData = await exportTeamsData(filters);

        if (exportData.length === 0) {
            return res.status(204).send("No teams found matching the specified filters.");
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const filename = `hackathon_teams_export_${timestamp}.csv`;

        // Inline CSV generation to avoid relying on external middleware
        const keys = Object.keys(exportData[0] || {});
        const escapeCell = (val: any) => {
            if (val === null || val === undefined) return '';
            const s = String(val);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };

        const header = keys.join(',');
        const rows = exportData.map(row => keys.map(k => escapeCell(row[k])).join(','));
        const csv = [header].concat(rows).join('\r\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csv);

    } catch (error: any) {
        console.error("Controller Error [exportTeamsCSVController]:", error.message);
        return res.status(500).json({ message: "Server Error", details: error.message });
    }
};