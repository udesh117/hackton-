import { Response } from "express";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";
import { getRelevantNotifications } from "../../services/participant/notification.service";
import { supabase } from "../../lib/supabaseClient";
import { markNotificationRead } from "../../services/participant/notification.service";

// ------------------------------------------------------------------
// 1. GET /api/notifications (Fetch Announcements)
// ------------------------------------------------------------------
export const getNotificationsController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // 1. Get filtered announcements (Service handles Role + City/Team filtering)
        const rawNotifications = await getRelevantNotifications(userId, userRole);

        // 2. Fetch the read status for this user (Manual Join)
        // We do this in the controller because we need to join user-specific state 
        // with the public content fetched above.
        const { data: readStatuses } = await supabase
            .from("UserNotifications")
            .select("notification_id, is_read")
            .eq("user_id", userId);

        const readStatusMap = new Map(readStatuses?.map((r: any) => [r.notification_id, r.is_read]));

        // 3. Merge read status into the final response
        const notifications = rawNotifications.map((notification: any) => ({
            ...notification,
            is_read: readStatusMap.get(notification.id) || false,
        }));

        return res.status(200).json({
            message: "Notifications retrieved.",
            notifications,
            count: notifications.length
        });

    } catch (error: any) {
        console.error("Controller Error [getNotifications]:", error.message);
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// ------------------------------------------------------------------
// 2. PATCH /api/notifications/read (Mark Read)
// ------------------------------------------------------------------
export const markNotificationReadController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user!.id;
        const { notificationIds, markAll } = req.body; // Expect an array of IDs or a 'markAll' flag

        if (markAll) {
            // A. Mark ALL unread notifications as read
            // Requires fetching all unread IDs first, then batch upserting them.
            // This is complex, so for simplicity: just mark the single ones provided.
            return res.status(400).json({ message: "Batch update (markAll) is not yet implemented." });

        } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
            // B. Mark specific IDs as read
            await Promise.all(notificationIds.map(id => markNotificationRead(userId, id)));
            
            return res.status(200).json({ message: "Notifications marked as read." });
            
        } else {
            return res.status(400).json({ message: "Must provide notificationIds array or markAll: true." });
        }

    } catch (error: any) {
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// ------------------------------------------------------------------
// 3. GET /api/event/info
// ------------------------------------------------------------------
export const getEventInfoController = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
    try {
        // Fetch the single Settings record
        const { data: settings, error } = await supabase
            .from("Settings")
            .select("event_name, submission_deadline, max_team_size")
            .single();

        if (error) {
            console.error("Error fetching settings:", error);
            // Fallback to a default message if DB fails
            return res.status(500).json({ message: "Failed to retrieve event configuration." });
        }

        // NOTE: If you store rules_url, timeline, and judging_criteria in the Settings table (e.g., as JSONB columns), 
        // you would return those directly. Since we only stored basic data, we structure the response:
        
        return res.status(200).json({
            message: "Event details retrieved.",
            eventInfo: {
                event_name: settings?.event_name || "Hackathon X",
                // This deadline is dynamic now
                submission_deadline: settings?.submission_deadline, 
                max_team_size: settings?.max_team_size,
                
                // Static fields we didn't store in the database (replace with DB fetch if stored)
                timeline: [
                    { stage: "Registration", date: "2025-01-01" },
                    { stage: "Submission Deadline", date: settings?.submission_deadline },
                ],
                rules_url: "http://hackonx.com/rules",
                judging_criteria: [
                    { name: "Innovation", weight: 30 },
                    { name: "Feasibility", weight: 20 }
                ],
                venue: "Online / Virtual",
            }
        });

    } catch (error: any) {
        return res.status(500).json({ message: "Server Error", error: error.message });
    }
};