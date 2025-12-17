import { supabase } from "../lib/supabaseClient";

/**
 * Checks if the current time is past the event's submission deadline.
 * @returns {Promise<boolean>} True if the deadline has passed, false otherwise.
 */
export const isDeadlinePassed = async (): Promise<boolean> => {
    // 1. Fetch the deadline from the Settings table (Singleton record)
    const { data: settings, error } = await supabase
        .from("Settings")
        .select("submission_deadline")
        .single();

    if (error) {
        // If we can't get the settings, assume deadline is open but log a warning.
        console.warn("WARNING: Could not fetch Settings for deadline check. Assuming open.");
        return false; 
    }

    const deadline = settings?.submission_deadline;

    // 2. If no deadline is set, always allow submission (default to open)
    if (!deadline) {
        return false;
    }

    // 3. Compare current time vs deadline time
    const deadlineDate = new Date(deadline);
    const now = new Date();

    return now > deadlineDate;
};