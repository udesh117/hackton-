import { supabase } from "../../lib/supabaseClient";

// ------------------------------------------------------------------
// 1. GET NOTIFICATIONS (Filtering and Joining Read Status)
// ------------------------------------------------------------------
/**
 * Fetches notifications relevant to the user, joined with their read status.
 */
// --- HELPER: Get User Context for Filtering ---
/**
 * Fetches relevant attributes for the user (City, College, Team ID) 
 * to compare against notification criteria.
 */
const getUserContext = async (userId: string) => {
    // Fetch team details if the user is in a team
    const { data: membership } = await supabase
        .from("TeamMembers")
        .select(`
            team_id,
            team:Teams (
                id,
                city,
                college,
                project_category
            )
        `)
        .eq("user_id", userId)
        .maybeSingle();

    // If no team (e.g., user is a Judge or individual), return empty context
    if (!membership || !membership.team) return {};

    // Handle Supabase response structure (array vs object)
    const team = Array.isArray(membership.team) ? membership.team[0] : membership.team;

    return {
        teamId: team.id,
        city: team.city,
        college: team.college,
        category: team.project_category
    };
};

// --- SERVICE: Get Relevant Notifications ---
export const getRelevantNotifications = async (userId: string, userRole: string): Promise<any[]> => {
    
    // 1. Get the user's specific attributes (Context)
    const userContext = await getUserContext(userId);

    // 2. Fetch Candidates:
    //    - Match Role (participant, judge, etc.) OR 'all'
    //    - OR Match specific target_user_id (Direct Message)
    const { data: notifications, error } = await supabase
        .from("Notifications")
        .select("*") 
        // .or(`target_role.eq.${userRole},target_role.eq.all,target_user_id.eq.${userId}`)
        .or(`target_role.eq.${userRole},target_role.eq.all`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Service Error [getRelevantNotifications]:", error.message);
        throw new Error("Failed to retrieve notifications.");
    }

    // 3. Apply Criteria Filtering (In-Memory)
    //    We filter out notifications where the user doesn't match the specific 'target_criteria'
    const filteredNotifications = notifications.filter((notification: any) => {
        
        // A. Direct Targeting (Always allow if user ID specifically matches)
        if (notification.target_user_id === userId) return true;

        // B. No Criteria (Broadcast to Role) -> Allow
        // If target_criteria is null or empty, it's a general announcement for the role.
        if (!notification.target_criteria || Object.keys(notification.target_criteria).length === 0) {
            return true;
        }

        // C. Check Criteria Matches
        // Logic: User must match ALL keys defined in target_criteria (AND condition)
        const criteria = notification.target_criteria;
        
        for (const key of Object.keys(criteria)) {
            const requiredValue = criteria[key];
            const userValue = userContext[key as keyof typeof userContext];

            // 1. If user doesn't have the attribute (e.g. not in a team) -> Exclude
            if (!userValue) return false;

            // 2. Perform comparison (Case-insensitive for strings, strict for IDs)
            if (typeof requiredValue === 'string' && typeof userValue === 'string') {
                if (requiredValue.toLowerCase() !== userValue.toLowerCase()) return false;
            } else {
                if (requiredValue != userValue) return false;
            }
        }

        return true;
    });

    return filteredNotifications;
};

// ------------------------------------------------------------------
// 2. MARK NOTIFICATION READ
// ------------------------------------------------------------------
/**
 * Inserts or updates a record in the UserNotifications table to mark a notification as read.
 */
export const markNotificationRead = async (userId: string, notificationId: string): Promise<void> => {
    // Upsert ensures we create the record if it doesn't exist, or update it if it does
    const { error } = await supabase
        .from("UserNotifications")
        .upsert({
            user_id: userId,
            notification_id: notificationId,
            is_read: true,
            read_at: new Date().toISOString()
        }, { onConflict: 'user_id, notification_id' }); // Conflict resolution key

    if (error) {
        console.error("Service Error [markNotificationRead]:", error.message);
        throw new Error("Failed to update notification read status.");
    }
};