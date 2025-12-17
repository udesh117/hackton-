import { supabase } from "../../lib/supabaseClient";
import { getRelevantNotifications } from "../participant/notification.service";

/**
 * Fetches all teams assigned to a specific judge, including necessary team and submission metadata.
 */
// Update the function signature to include pagination parameters
export const getAssignedTeams = async (
    judgeId: string, 
    page: number = 1, 
    limit: number = 10 // Defaulting values for safety
): Promise<{ teams: any[], totalCount: number }> => {
    
    // 1. Calculate the OFFSET (skip)
    const offset = (page - 1) * limit;

    // 2. Join JudgeAssignments with Teams and Submissions
    // Request the total count using { count: 'exact' }
    const { data, error, count: totalCount } = await supabase
        .from("JudgeAssignments")
        .select(
            `
            team:Teams (
                id, name, leader_id, verification_status,
                
                submission:Submissions!left (
                    id, status, submitted_at, repo_url, zip_storage_path
                )
            ),
            
            evaluation:Evaluations!left ( 
                id, status, submitted_at
            )
            `, 
            { count: 'exact' } // <-- CRITICAL: Requests the total count of matching rows
        )
        .eq("judge_id", judgeId)
        // --- PAGINATION APPLIED HERE ---
        .range(offset, offset + limit - 1) // Apply the range: Supabase range is inclusive
        // -------------------------------
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Service Error [getAssignedTeams]:", error.message);
        throw new Error("Failed to retrieve judge assignments.");
    }
    
    // 3. Format the response
    const teams = (data || []).map((assignment: any) => {
        const team = assignment?.team ?? null;
        // The submission logic needs to handle Supabase array/object return structure
        const submission = team?.submission ? (Array.isArray(team.submission) ? team.submission[0] : team.submission) : null;
        const evaluation = assignment?.evaluation ? (Array.isArray(assignment.evaluation) ? assignment.evaluation[0] : assignment.evaluation) : null;

        return {
            teamId: team?.id || null,
            teamName: team?.name || null,
            verificationStatus: team?.verification_status || 'unknown',
            
            // Submission Details
            submissionId: submission?.id || null,
            submissionStatus: submission?.status || 'no_submission',
            submittedAt: submission?.submitted_at || null,
            
            // Judge's Evaluation Status
            evaluationId: evaluation?.id || null,
            evaluationStatus: evaluation?.status || 'none', // 'none', 'draft', 'submitted'
            evaluationSubmittedAt: evaluation?.submitted_at || null,
            
            isReadyForEvaluation: submission?.status === 'submitted'
        };
    });

    // 4. Return the paginated assignments AND the total count
    return {
        teams: teams,
        totalCount: totalCount || 0,
    };
};

/**
 * Fetches aggregated data for the Judge Dashboard.
 */
export const getJudgeDashboardSummary = async (judgeId: string): Promise<any> => {
    // 1. Get all assignments for the judge
    const { teams: assignments } = await getAssignedTeams(judgeId);

    const userRole = 'judge';

    // We fetch all relevant announcements and include the read status via the service helper
    const relevantNotifications = await getRelevantNotifications(judgeId, userRole);

    // Filter to find unread notifications
    const unreadNotifications = relevantNotifications.filter((n: any) => {
        // The service returns the read_status as a nested array/object or null
        const readStatus = n.read_status?.[0]; 
        return !readStatus || readStatus.is_read === false;
    });

    const unreadCount = unreadNotifications.length;
    const latestNotification = relevantNotifications.length > 0 ? relevantNotifications[0] : null;

    const announcementsSummary = {
        unreadCount: unreadCount,
        latestTitle: latestNotification ? latestNotification.title : null,
        latestDate: latestNotification ? latestNotification.created_at : null,
    };

    const totalAssigned = assignments.length;
    let completedCount = 0;
    let pendingCount = 0;
    let readyForEvaluationCount = 0;

    assignments.forEach((assignment: any) => {
        if (assignment.evaluationStatus === 'submitted') {
            completedCount++;
        } else if (assignment.evaluationStatus === 'draft') {
            // Count drafts as pending (not fully completed)
            pendingCount++;
        }
        
        if (assignment.isReadyForEvaluation) {
            readyForEvaluationCount++;
        }
    });

    // Final Calculation: Pending is Total - Completed
    const actualPendingCount = totalAssigned - completedCount;

    return {
        totalAssigned,
        readyForEvaluationCount,
        completedCount,
        pendingCount: actualPendingCount, announcementsSummary,
    };
};

/**
 * Fetches the submitted project files/links for a specific team,
 * ONLY if the requesting judge is assigned to that team.
 */
export const getSubmissionForEvaluation = async (judgeId: string, teamId: string): Promise<any> => {
    // 1. Check Judge Assignment (CRITICAL SECURITY CHECK)
    const { count, error: assignmentError } = await supabase
        .from("JudgeAssignments")
        .select("*", { count: 'exact', head: true })
        .eq("judge_id", judgeId)
        .eq("team_id", teamId);

    if (assignmentError) {
        console.error("Assignment Check Error:", assignmentError.message);
        throw new Error("Database error during assignment check.");
    }
    
    // If the count is 0, the judge is not assigned to this team.
    if (count === 0) {
        // Return a custom error that the controller can map to 403
        throw new Error("Forbidden. Judge not assigned to this team.");
    }

    // 2. Fetch the Submitted Submission Data
    const { data: submissionData, error: submissionError } = await supabase
        .from("Submissions")
        .select(`
            id, 
            status, 
            submitted_at, 
            repo_url, 
            zip_storage_path,
            team_id
        `)
        .eq("team_id", teamId)
        .eq("status", "submitted") // Only fetch finalized submissions
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single(); // Use single since we limit(1)

    if (submissionError || !submissionData) {
        // This is okay if the team hasn't submitted yet.
        console.warn(`Submission not found for Team ${teamId} or not submitted.`);
        return null; 
    }

    return submissionData;
};

/**
 * Saves or updates an evaluation draft using UPSERT.
 */
export const saveEvaluationDraft = async (
    judgeId: string, 
    teamId: string, 
    submissionId: string,
    assignmentId: string, 
    payload: any
): Promise<any> => {
    // 1. Prepare data for UPSERT
    // We rely on the controller to handle assignment and validation checks.
    const evaluationData = {
        judge_id: judgeId,
        team_id: teamId,
        submission_id: submissionId,
        assignment_id: assignmentId,
        
        // Scores (Map directly to the new database columns)
        score_innovation: payload.score_innovation,
        score_feasibility: payload.score_feasibility,
        score_execution: payload.score_execution,
        score_presentation: payload.score_presentation,
        
        comments: payload.comments,
        status: 'draft', // Always set to draft for this endpoint
        
        // These fields are only set on submit/update, not draft
        submitted_at: null, 
        is_locked_by_admin: false,
    };
    
    // 2. Perform UPSERT (Insert ON CONFLICT Update)
    const { data: evaluation, error } = await supabase
        .from("Evaluations")
        .upsert(evaluationData, { 
            onConflict: 'judge_id, team_id', // Conflict resolution key (from schema)
            ignoreDuplicates: false 
        })
        .select()
        .single();

    if (error) {
        console.error("Service Error [saveEvaluationDraft]:", error.message);
        throw new Error("Failed to save evaluation draft.");
    }

    return evaluation;
};


/**
 * Retrieves the JudgeAssignment ID for a specific judge/team combination.
 * This ID is needed for the Evaluations table.
 */
export const getAssignmentId = async (judgeId: string, teamId: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from("JudgeAssignments")
        .select("id")
        .eq("judge_id", judgeId)
        .eq("team_id", teamId)
        .maybeSingle();

    if (error) {
        console.error("Service Error [getAssignmentId]:", error.message);
        throw new Error("Failed to look up assignment ID.");
    }

    return data ? data.id : null;
};


/**
 * Retrieves a judge's evaluation record (draft or submitted) for a specific team.
 */
export const getEvaluationByTeamId = async (judgeId: string, teamId: string): Promise<any> => {
    // We already checked assignment in previous steps, so we just fetch the record.
    const { data, error } = await supabase
        .from("Evaluations")
        .select(`
            id, status, comments, submitted_at, is_locked_by_admin, 
            score_innovation, score_feasibility, score_execution, score_presentation
        `)
        .eq("judge_id", judgeId)
        .eq("team_id", teamId)
        .maybeSingle();

    if (error) {
        console.error("Service Error [getEvaluationByTeamId]:", error.message);
        throw new Error("Failed to retrieve evaluation record.");
    }

    // Return the data or null if not found
    return data;
};

/**
 * Finalizes the evaluation record by setting status to 'submitted'.
 */
export const submitFinalEvaluation = async (
    judgeId: string, 
    teamId: string, 
    submissionId: string, // Needed to ensure we are submitting against a valid record
    payload: any
): Promise<any> => {
    // 1. Prepare data for update
    const submissionData = {
        // Scores (Must be present due to validateScoreRanges middleware)
        score_innovation: payload.score_innovation,
        score_feasibility: payload.score_feasibility,
        score_execution: payload.score_execution,
        score_presentation: payload.score_presentation,
        
        comments: payload.comments,
        status: 'submitted', // CRITICAL: Final status flag
        submitted_at: new Date().toISOString(),
    };
    
    // 2. Perform UPDATE based on unique key
    const { data: evaluation, error } = await supabase
        .from("Evaluations")
        .update(submissionData)
        .eq("judge_id", judgeId)
        .eq("team_id", teamId)
        .select()
        .single();

    if (error) {
        console.error("Service Error [submitFinalEvaluation]:", error.message);
        throw new Error("Failed to submit final evaluation.");
    }

    return evaluation;
};

/**
 * Updates a submitted evaluation. Requires the judge/team record exists 
 * and is NOT locked by admin.
 */
export const updateSubmittedEvaluation = async (
    judgeId: string, 
    teamId: string, 
    payload: any
): Promise<any> => {
    // 1. Prepare data for update (only scores and comments are updated)
    const updateData = {
        score_innovation: payload.score_innovation,
        score_feasibility: payload.score_feasibility,
        score_execution: payload.score_execution,
        score_presentation: payload.score_presentation,
        comments: payload.comments,
        updated_at: new Date().toISOString(), // Manual update is okay, but the trigger should catch this too
    };
    
    // 2. Perform UPDATE based on unique key and ensure it's NOT locked
    const { data: evaluation, error } = await supabase
        .from("Evaluations")
        .update(updateData)
        .eq("judge_id", judgeId)
        .eq("team_id", teamId)
        .eq("is_locked_by_admin", false) // CRITICAL: Only update if not locked
        .select()
        .single();

    if (error) {
        console.error("Service Error [updateSubmittedEvaluation]:", error.message);
        throw new Error("Failed to update submitted evaluation.");
    }
    
    // Check if the update succeeded (it returns null if the record exists but the WHERE clause failed)
    if (!evaluation) {
         // This will be caught if the record was locked OR if the record simply didn't exist/wasn't submitted
         throw new Error("Update failed. Evaluation may be locked by an Administrator or not submitted.");
    }

    return evaluation;
};

/**
 * Lists all evaluations (drafts and submitted) created by the judge.
 */
export const getMyReviews = async (judgeId: string): Promise<any> => {
    // 1. Fetch Evaluations, joining to get the Team name and Submission status
    const { data, error } = await supabase
        .from("Evaluations")
        .select(`
            id, status, submitted_at, updated_at, is_locked_by_admin,
            
            team:Teams (
                id, name, verification_status
            ),
            submission:Submissions!inner (
                status
            )
        `)
        .eq("judge_id", judgeId)
        .order('updated_at', { ascending: false }); // Show most recently modified first

    if (error) {
        console.error("Service Error [getMyReviews]:", error.message);
        throw new Error("Failed to retrieve judge reviews list.");
    }
    
    // 2. Format the response for a clean list view
    const reviews = (data || []).map((review: any) => {
        const team = review?.team ? (Array.isArray(review.team) ? review.team[0] : review.team) : null;
        const submission = review?.submission ? (Array.isArray(review.submission) ? review.submission[0] : review.submission) : null;

        return {
            evaluationId: review.id,
            teamId: team?.id || null,
            teamName: team?.name || null,
            evaluationStatus: review.status, // 'draft', 'submitted'
            isLocked: review.is_locked_by_admin,
            submittedAt: review.submitted_at,
            lastUpdatedAt: review.updated_at,
            submissionStatus: submission?.status || null
        };
    });

    return reviews;
};