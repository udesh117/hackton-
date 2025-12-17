import { supabase } from "../../lib/supabaseClient";

interface SubmissionData {
    teamId: string;
    title: string;
    description?: string;
    repoUrl?: string;
    zipStoragePath?: string;
}

// 1. CREATE SUBMISSION (Initial Draft)

// Creates the initial submission record for a team, setting the status to 'draft'.
export const createSubmission = async (data: SubmissionData): Promise<any> => {
    // 1. Check if a submission already exists (optional, but prevents clutter)
    const { data: existingSubmission } = await supabase
        .from("Submissions")
        .select("id")
        .eq("team_id", data.teamId)
        .eq("status", "draft")
        .maybeSingle();

    if (existingSubmission) {
        // If a draft exists, update it instead of creating a new one
        const { data: updatedSubmission, error: updateError } = await supabase
            .from("Submissions")
            .update({
                title: data.title,
                description: data.description,
                repo_url: data.repoUrl,
                zip_storage_path: data.zipStoragePath,
                created_at: new Date().toISOString() // update timestamp
            })
            .eq("id", existingSubmission.id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        return updatedSubmission;
    }

    // 2. Insert new submission record
    const { data: newSubmission, error: insertError } = await supabase
        .from("Submissions")
        .insert({
            team_id: data.teamId,
            title: data.title,
            description: data.description,
            repo_url: data.repoUrl,
            zip_storage_path: data.zipStoragePath,
            status: 'draft'
        })
        .select()
        .single();

    if (insertError) throw insertError;
    return newSubmission;
};


// 2. GET SUBMISSION BY ID
// Retrieves a submission by its ID. Used by participants (to view) and judges/admins.

export const getSubmissionById = async (submissionId: string): Promise<any> => {
    const { data: submission, error } = await supabase
        .from("Submissions")
        .select(`
            *,
            team:Teams (
                id, name, leader_id,
                members:TeamMembers (
                    user:Users (
                        id, email, role,
                        Profiles (first_name, last_name)
                    )
                )
            )
        `)
        .eq("id", submissionId)
        .maybeSingle();

    if (error) {
        console.error("Service Error [getSubmissionById]:", error.message);
        throw new Error("Failed to retrieve submission details.");
    }
    
    return submission;
};


// 3. UPDATE SUBMISSION DETAILS (PATCH)

// Allows updating title, description, or links on a submission.

interface SubmissionUpdateData {
    title?: string;
    description?: string;
    repoUrl?: string;
    zipStoragePath?: string;
}

export const updateSubmissionDetails = async (submissionId: string, teamId: string, updates: SubmissionUpdateData): Promise<any> => {
    // Prevent updating 'submitted_at' or 'status' via this general endpoint
    const validUpdates = {
        title: updates.title,
        description: updates.description,
        repo_url: updates.repoUrl,
        zip_storage_path: updates.zipStoragePath,
    };
    
    const { data: updatedSubmission, error } = await supabase
        .from("Submissions")
        .update(validUpdates)
        .eq("id", submissionId)
        .eq("team_id", teamId) // Ensure ownership
        .select()
        .single();

    if (error) {
        console.error("Service Error [updateSubmissionDetails]:", error.message);
        throw new Error("Failed to update submission details.");
    }
    
    return updatedSubmission;
};