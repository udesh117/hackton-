import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { getRelevantNotifications } from "../../services/participant/notification.service";
import { supabase } from "../../lib/supabaseClient";

// Helper function to fetch the user's team details and status efficiently
const getTeamDataForDashboard = async (userId: string) => {
    const { data: teamData, error } = await supabase
        .from("TeamMembers")
        .select(`
            team:Teams (
                id, name, leader_id, verification_status,
                members:TeamMembers (
                    user_id
                ),
                submission:Submissions (
                    id, status, submitted_at
                )
            )
        `)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) throw error;
    if (!teamData?.team) return null;

    // Supabase may return the related `team` as an array when using nested selects.
    // Normalize to a single object for easier usage below.
    const team = Array.isArray(teamData.team) ? teamData.team[0] : teamData.team;
    const teamId = team?.id;
    const submission = Array.isArray(team?.submission) ? team.submission[0] : team.submission; // Get the single submission record

    return {
        teamId: teamId,
        teamName: team?.name,
        leaderId: team?.leader_id,
        memberCount: Array.isArray(team?.members) ? team.members.length : 0,
        verificationStatus: team?.verification_status || 'pending',
        submissionStatus: submission?.status || 'no_submission',
        submissionId: submission?.id || null,
        isLeader: team?.leader_id === userId
    };
};


// ------------------------------------------------------------------
// GET /api/participant/dashboard
// ------------------------------------------------------------------
export const getParticipantDashboardController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // 1. Fetch Aggregated Team & Submission Status
        const teamData = await getTeamDataForDashboard(userId);
        
        // 2. Fetch Aggregated Notification/Announcement Summary
        const notifications = await getRelevantNotifications(userId, userRole);
        const unreadCount = notifications.filter((n: any) => !n.is_read).length;

        // 3. Define Deadlines (Placeholder for production config)
        const upcomingDeadlines = [
            { name: "Submission Lock", date: "2025-12-15T23:59:00Z" },
            { name: "Judging Starts", date: "2025-12-16T09:00:00Z" }
        ];

        return res.status(200).json({
            message: "Dashboard summary retrieved.",
            dashboard: {
                teamStatus: teamData ? {
                    id: teamData.teamId,
                    name: teamData.teamName,
                    status: teamData.verificationStatus,
                    memberCount: teamData.memberCount,
                    isLeader: teamData.isLeader
                } : null,
                submissionStatus: {
                    state: teamData?.submissionStatus || 'no_team',
                    submissionId: teamData?.submissionId || null
                },
                announcementsSummary: {
                    total: notifications.length,
                    unreadCount: unreadCount,
                    latestTitle: notifications[0]?.title || null
                },
                upcomingDeadlines: upcomingDeadlines
            }
        });

    } catch (error: any) {
        console.error("Dashboard Error:", error.message);
        return res.status(500).json({ message: "Server Error" });
    }
};