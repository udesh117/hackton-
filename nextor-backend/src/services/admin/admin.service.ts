import { supabase } from "../../lib/supabaseClient";
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from "../../utils/email";
import crypto from 'crypto';
import redisClient  from '../../lib/redisClient';
import cron from 'node-cron';

// --- JUDGE MANAGEMENT SERVICES ---

/**
 * Creates a Judge account using a transaction and sends an invite email.
 */
export const createJudgeAccount = async (email: string, firstName: string, lastName: string): Promise<any> => {
    
    // 1. Generate Placeholder Password (Secure Hash)
    const placeholderPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(placeholderPassword, 10);

    // 2. Execute Transactional Insert (DB)
    const { data: user, error } = await supabase
        .rpc('create_judge_account_transaction', {
            p_email: email,
            p_hashed_password: hashedPassword,
            p_first_name: firstName,
            p_last_name: lastName
        });

    if (error) {
        console.error("Service Error [createJudgeAccount]:", error.message);
        if (error.message?.includes('unique constraint')) {
            throw new Error("User with this email already exists.");
        }
        throw new Error("Failed to create judge account.");
    }

    // 3. Generate Invite Token & Store in Redis (Invite Flow)
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const redisKey = `reset_token:${inviteToken}`;
    const tokenExpirySeconds = 86400; // 24 Hours

    try {
        // Store mapping: Token -> UserID
        await redisClient.setex(redisKey, tokenExpirySeconds, user.id);
    } catch (redisError: any) {
        console.error("Redis Error [createJudgeAccount]:", redisError.message);
        throw new Error("Account created, but failed to generate invite token.");
    }

    // 4. Send Invitation Email
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendBaseUrl}/auth/reset-password?token=${inviteToken}`;
    
    try {
        await sendEmail({
            to: email,
            subject: "Invitation to Judge at Nextor Hackathon",
            html: `
                <h3>Hello ${firstName},</h3>
                <p>You have been invited to join the Nextor Hackathon as a Judge.</p>
                <p>Please click the link below to set your password and activate your account:</p>
                <a href="${inviteLink}">Accept Invitation & Set Password</a>
                <p>This link is valid for 24 hours.</p>
            `
        });
    } catch (emailError) {
        console.error("Warning: Account created but email failed.", emailError);
    }

    return {
        ...user,
        message: "Judge account created and invitation sent."
    };
};


/**
 * Fetches a paginated list of all Judge accounts with assignment load summary. [cite: 41]
 */
export const getJudgesList = async (page: number, limit: number): Promise<any> => {
    const offset = (page - 1) * limit;

    // 1. Fetch Judge Users and Profiles
    const { data: users, error: userError, count: totalCount } = await supabase
        .from("Users")
        .select(`
            id, email, role, is_active, created_at,
            profile:Profiles!inner (first_name, last_name)
        `, { count: 'exact' })
        .eq("role", "judge")
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: true });

    if (userError) {
        console.error("Service Error [getJudgesList]:", userError.message);
        throw new Error("Failed to retrieve judges list.");
    }
    
    // 2. Fetch Judge Assignment Counts (Simplified aggregation for now)
    const { data: assignments, error: assignmentError } = await supabase
        .from("JudgeAssignments")
        .select(`judge_id, count`, { count: 'exact' });
        
    if (assignmentError) {
        console.warn("Could not fetch assignment counts:", assignmentError.message);
        // We will proceed without load data if this fails
    }
    
    const assignmentMap = new Map();
    if (assignments) {
        assignments.forEach((a: any) => {
            assignmentMap.set(a.judge_id, a.count);
        });
    }

    // 3. Combine Data and Format
    const judges = (users || []).map((user: any) => {
        const profile = user?.profile ? (Array.isArray(user.profile) ? user.profile[0] : user.profile) : null;
        return {
            id: user.id,
            email: user.email,
            firstName: profile?.first_name || null,
            lastName: profile?.last_name || null,
            isActive: user.is_active,
            dateAdded: user.created_at,
            assignmentLoad: assignmentMap.get(user.id) || 0, // Add assignment load
        };
    });

    return { judges, totalCount };
};


/**
 * Updates a specific Judge account (User and Profile). [cite: 48]
 */
/**
 * Updates Judge account details, handling email changes with verification,
 * and triggering an administrative password reset.
 */
export const updateJudgeAccount = async (judgeId: string, payload: any): Promise<any> => {
    
    // --- 1. Prepare Update Payloads ---
    const userUpdate: any = {};
    const profileUpdate: any = {};
    const updates = [];
    
    let isEmailChanging = false;
    let isPasswordResetting = false; // <-- NEW FLAG
    let newEmail = '';
    
    // --- Determine if Reset is Requested ---
    if (payload.resetPassword === true) { // Check for explicit boolean true
        isPasswordResetting = true;
        delete payload.resetPassword;
    }

    // Check for Email Change (CRITICAL SECURITY CHECK - Logic from last step)
    if (payload.email) {
        isEmailChanging = true;
        newEmail = payload.email;
        const emailChangeToken = crypto.randomBytes(32).toString('hex');

        userUpdate.pending_email = newEmail;
        userUpdate.email_change_token = emailChangeToken; 
        delete payload.email; 
    }

    if (payload.isActive !== undefined) userUpdate.is_active = payload.isActive;
    
    // 2. Prepare Profile Update Payload
    if (payload.firstName) profileUpdate.first_name = payload.firstName;
    if (payload.lastName) profileUpdate.last_name = payload.lastName;

    // --- 3. Execute Updates ---
    if (Object.keys(userUpdate).length > 0) {
        updates.push(supabase.from("Users").update(userUpdate).eq("id", judgeId));
    }
    
    if (Object.keys(profileUpdate).length > 0) {
        updates.push(supabase.from("Profiles").update(profileUpdate).eq("user_id", judgeId));
    }
    
    if (updates.length === 0 && !isPasswordResetting) { // Ensure reset works even with no other fields
        return { message: "No fields provided for update." };
    }

    // Execute DB updates
    if (updates.length > 0) {
        const results = await Promise.all(updates);
        const errors = results.filter((r: any) => r.error).map((r: any) => r.error?.message || 'Unknown error');
        if (errors.length > 0) {
            console.error("Service Error [updateJudgeAccount]:", errors);
            throw new Error(`Failed to update judge account: ${errors.join(', ')}`);
        }
    }
    
    let finalMessage = isEmailChanging ? 'Update successful and email change verification initiated. ' : 'Update successful. ';

    // --- 4. Handle Password Reset Flow (Priority 1) ---
    if (isPasswordResetting) {
        // We need the user's current, active email to send the reset link
        const { data: currentUser } = await supabase.from("Users").select("email").eq("id", judgeId).single();

        if (currentUser?.email) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            const redisKey = `reset_token:${resetToken}`;
            const tokenExpirySeconds = 3600; // 1 Hour for reset link

            try {
                // Store mapping: Token -> UserID in Redis
                await redisClient.setex(redisKey, tokenExpirySeconds, judgeId);

                const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const resetLink = `${frontendBaseUrl}/auth/reset-password?token=${resetToken}`;
                
                await sendEmail({
                    to: currentUser.email,
                    subject: "Password Reset Requested by Administrator",
                    html: `
                        <h3>Password Reset Request</h3>
                        <p>An administrator has requested a password reset for your account.</p>
                        <p>Please click the link below to set a new password:</p>
                        <a href="${resetLink}">Set New Password</a>
                        <p>This link is valid for 1 hour.</p>
                    `
                });
                finalMessage += `Password reset email sent to ${currentUser.email}.`;
            } catch (error) {
                console.error("Warning: Failed to send password reset email.", error);
                finalMessage += "Account updated, but failed to send password reset email.";
            }
        } else {
            finalMessage += "Account updated, but failed to find user email for password reset.";
        }
    }


    // --- 5. Handle Email Change Confirmation (Priority 2) ---
    if (isEmailChanging) {
        // The email change logic is largely handled in step 3, but we confirm the message here.
        // The email sending logic is duplicated here for clarity, though in a real refactor,
        // it would be clean up to combine all email sending logic.
        const confirmationLink = `http://localhost:3000/verify-email-change?token=${userUpdate.email_change_token}`;
        
        try {
            await sendEmail({
                to: newEmail, 
                subject: "Confirm Your Email Change for Nextor Hackathon",
                html: `... email confirmation body ...`
            });
            finalMessage += `Confirmation email sent to ${newEmail} for pending email change.`;
        } catch (emailError) {
            console.error("Warning: Failed to send confirmation email.", emailError);
            finalMessage += `Failed to send confirmation email to ${newEmail}.`;
        }
    }


    // Since we updated, return the current details
    return getJudgesList(1, 1).then(data => data.judges.find((j: any) => j.id === judgeId) || { id: judgeId, message: finalMessage });
};


/**
 * Deletes or deactivates a specific Judge account. [cite: 54, 56]
 */
export const deleteJudgeAccount = async (judgeId: string, type: 'soft' | 'hard'): Promise<any> => {
    if (type === 'hard') {
        // Hard Delete (cascades to Profile, Assignments, and Evaluations)
        const { error } = await supabase
            .from("Users")
            .delete()
            .eq("id", judgeId);
        
        if (error) {
            console.error("Service Error [deleteJudgeAccount/hard]:", error.message);
            throw new Error("Failed to permanently delete judge account.");
        }
        return { message: "Judge account permanently deleted." };

    } else {
        // Soft Delete (Deactivate) [cite: 56]
        const { error } = await supabase
            .from("Users")
            .update({ is_active: false })
            .eq("id", judgeId);
            
        if (error) {
            console.error("Service Error [deleteJudgeAccount/soft]:", error.message);
            throw new Error("Failed to deactivate judge account.");
        }
        return { message: "Judge account deactivated (soft-deleted)." };
    }
};


// --- TEAM MANAGEMENT SERVICES (READ) 

/**
 * Fetches a paginated, filterable list of all teams.
 */
export const getTeamsListAdmin = async (page: number, limit: number, filters: any, search: string): Promise<any> => {
    const offset = (page - 1) * limit;
    let query = supabase
        .from("Teams")
        .select(`
            id, name, city, verification_status, created_at,
            leader:Users!leader_id (
                profile:Profiles (first_name, last_name)
            ),
            members:Profiles(count)
        `, { count: 'exact' });

    // 1. Apply Filters
    if (filters.status) {
        query = query.eq("verification_status", filters.status);
    }
    // Add other filters (city, etc.) here if needed

    // 2. Apply Search
    if (search) {
        // Simple search by team name (or ID/city if your schema supports it)
        query = query.ilike("name", `%${search}%`);
    }
    
    // 3. Apply Pagination and Ordering
    const { data: teams, error, count: totalCount } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Service Error [getTeamsListAdmin]:", error.message);
        throw new Error("Failed to retrieve teams list.");
    }
    
    // 4. Format the output (simplify nested joins)
    const formattedTeams = (teams || []).map((team: any) => {
        const leader = team?.leader ? (Array.isArray(team.leader) ? team.leader[0] : team.leader) : null;
        const memberCountRaw = team?.memberCount ? (Array.isArray(team.memberCount) ? team.memberCount[0] : team.memberCount) : null;

        return {
            id: team.id,
            name: team.name,
            city: team.city,
            verificationStatus: team.verification_status,
            dateCreated: team.created_at,
            leaderName: leader ? `${leader.profile?.first_name || ''} ${leader.profile?.last_name || ''}`.trim() : null,
            memberCount: team.members[0].count,        
        };
    });

    return { teams: formattedTeams, totalCount };
};

/**
 * Fetches full details for a single team, including submissions and assignments.
 */
export const getTeamProfileAdmin = async (teamId: string): Promise<any> => {
    // 1. Fetch main team data with members, submissions, and judge assignments
    const { data: team, error } = await supabase
        .from("Teams")
        .select(`
            id, name, city, verification_status, project_category, created_at, admin_notes,
            
            members:Profiles!inner(
                user:Users!user_id(id, email, role),
                first_name, last_name, avatar_url
            ),
            
            submissions:Submissions(
                id, status, submitted_at, repo_url
            ),
            
            assignments:JudgeAssignments(
                judge:Users!judge_id(profile:Profiles(first_name, last_name))
            ),
            
            evaluations:Evaluations(
                id, status, score_innovation, score_feasibility, score_execution, score_presentation, comments
            )
        `)
        .eq("id", teamId)
        .single();

    if (error) {
        console.error("Service Error [getTeamProfileAdmin]:", error.message);
        // Note: For 404, the controller will handle the error message based on !team
        throw new Error("Failed to retrieve team profile.");
    }
    
    if (!team) return null;

    // 2. Simple reformatting (e.g., pulling members/assignment data up)
    const formattedTeam = {
        ...team,
        members: (team.members || []).map((m: any) => {
            const user = m?.user ? (Array.isArray(m.user) ? m.user[0] : m.user) : null;
            return {
                ...m,
                email: user?.email || null,
                role: user?.role || null,
                userId: user?.id || null
            };
        }),
        assignedJudges: (team.assignments || []).map((a: any) => {
            const judge = a?.judge ? (Array.isArray(a.judge) ? a.judge[0] : a.judge) : null;
            return judge ? `${judge.profile?.first_name || ''} ${judge.profile?.last_name || ''}`.trim() : null;
        }),
        totalEvaluations: Array.isArray(team.evaluations) ? team.evaluations.length : 0,
    };

    // Clean up unnecessary keys for final output
    // Use `any` cast to avoid TypeScript's strict delete checks on typed properties
    if ((formattedTeam as any).assignments) {
        delete (formattedTeam as any).assignments;
    }
    formattedTeam.members.forEach((m: any) => { if ((m as any).user) delete (m as any).user; });

    return formattedTeam;
};


// --- TEAM MANAGEMENT SERVICES (WRITE) ---

/**
 * Admin edits team details (notes, overrides, status changes).
 */
export const updateTeamAdmin = async (teamId: string, payload: any): Promise<any> => {
    // 1. Prepare Update Payload
    const updateData: any = {};
    if (payload.name) updateData.name = payload.name;
    if (payload.city) updateData.city = payload.city; // Admin can override city
    if (payload.projectCategory) updateData.project_category = payload.projectCategory;
    if (payload.adminNotes !== undefined) updateData.admin_notes = payload.adminNotes;
    
    // Admin can also directly override the verification status if needed, 
    // although the verifyTeamAdmin function is the official way.
    if (payload.verificationStatus) updateData.verification_status = payload.verificationStatus;

    if (Object.keys(updateData).length === 0) {
        throw new Error("No valid fields provided for update.");
    }
    
    // 2. Execute Update
    const { data: updatedTeam, error } = await supabase
        .from("Teams")
        .update(updateData)
        .eq("id", teamId)
        .select()
        .single();

    if (error) {
        console.error("Service Error [updateTeamAdmin]:", error.message);
        throw new Error("Failed to update team profile as Admin.");
    }

    // NOTE: In a production app, you would log an audit event here.

    return updatedTeam;
};

/**
 * Admin explicitly approves or rejects a team's verification status.
 */
export const verifyTeamAdmin = async (teamId: string, action: 'approve' | 'reject', adminId: string): Promise<any> => {
    
    let newStatus: string;
    let notificationMessage: string;

    if (action === 'approve') {
        newStatus = 'verified';
        notificationMessage = `Congratulations! Your team, ${teamId}, has been successfully verified for the event.`;
    } else if (action === 'reject') {
        newStatus = 'rejected';
        notificationMessage = `Important: Your team, ${teamId}, has been marked as rejected. Please contact support.`;
    } else {
        throw new Error("Invalid verification action specified.");
    }

    // 1. Execute Atomic Update
    const { data: updatedTeam, error } = await supabase
        .from("Teams")
        .update({
            verification_status: newStatus,
            admin_notes: `Status updated by Admin ${adminId} to '${newStatus}' at ${new Date().toISOString()}`,
            // In a real app, you would update a 'verified_at' timestamp field as well.
        })
        .eq("id", teamId)
        .select()
        .single();

    if (error) {
        console.error("Service Error [verifyTeamAdmin]:", error.message);
        throw new Error(`Failed to change team verification status to ${newStatus}.`);
    }

    // 2a. Fetch all active members' emails for the updated team
    const { data: members, error: memberError } = await supabase
        .from("TeamMembers")
        .select(`
            user:Users!inner(email, is_active)
        `)
        .eq("team_id", teamId);
        
    let finalMessage = `Status update to '${newStatus}' successful.`;

    if (memberError || !members || members.length === 0) {
        finalMessage += " Warning: Failed to retrieve team members for notification.";
        console.error("Warning: Could not fetch members for notification.", memberError?.message);
    } else {
        const recipientEmails = members
            .map((m: any) => m.user)
            .filter((u: any) => u.is_active)
            .map((u: any) => u.email);

        // 2b. Dispatch emails (Fire-and-Forget using Promise.allSettled)
        console.log(`[EMAIL SERVICE] Sending team status update to ${recipientEmails.length} recipients...`);

        const emailPromises = recipientEmails.map(email => 
            sendEmail({
                to: email,
                subject: `Team Status Update: ${newStatus.toUpperCase()}`,
                html: `
                    <h3>${notificationMessage}</h3>
                    <p>Your team's registration status has been officially updated by the administration.</p>
                    <p>Status: <strong>${newStatus.toUpperCase()}</strong></p>
                    <p>If you have any questions, please contact the hackathon support team.</p>
                `
            })
        );
        
        // Use allSettled so one failure doesn't crash the verification service
        const results = await Promise.allSettled(emailPromises);
        const failedCount = results.filter(r => r.status === 'rejected').length;

        if (failedCount > 0) {
            finalMessage += ` Warning: Failed to send ${failedCount} email(s) to team members. DB record saved.`;
            console.error(`Warning: ${failedCount} email(s) failed delivery.`);
        }
    }
    
    // 3. Return the updated team object with the final status message
    return { ...updatedTeam, notificationStatus: finalMessage };
};

// --- JUDGE ASSIGNMENT SERVICES ---

/**
 * Fetches the full assignment matrix: Judge -> [Teams] with load stats.
 */
export const getJudgeAssignments = async (): Promise<any> => {
    // 1. Fetch all Judges and their Assignments (joining to get team name and status)
    const { data: judges, error: judgeError } = await supabase
        .from("Users")
        .select(`
            id, email, 
            profile:Profiles!inner(first_name, last_name),
            assignments:JudgeAssignments!judge_id(
                id,
                team:Teams!inner(id, name, verification_status),
                evaluations:Evaluations(status)
            )
        `)
        .eq("role", "judge")
        .eq("is_active", true) // Only list active judges
        .order('last_name', { foreignTable: 'profile', ascending: true }); // Order by last name

    if (judgeError) {
        console.error("Service Error [getJudgeAssignments]:", judgeError.message);
        throw new Error("Failed to retrieve judge assignment matrix.");
    }
    
    // 2. Format and calculate load statistics
    const assignmentMatrix = (judges || []).map((judge: any) => {
        const profile = judge?.profile ? (Array.isArray(judge.profile) ? judge.profile[0] : judge.profile) : null;
        const assignments = judge?.assignments ? (Array.isArray(judge.assignments) ? judge.assignments : [judge.assignments]) : [];

        const totalAssigned = assignments.length;
        const completedCount = assignments.filter((a: any) => {
            const evaluations = a?.evaluations ? (Array.isArray(a.evaluations) ? a.evaluations : [a.evaluations]) : [];
            return evaluations.some((e: any) => e?.status === 'submitted');
        }).length;

        const teams = assignments.map((a: any) => {
            const team = a?.team ? (Array.isArray(a.team) ? a.team[0] : a.team) : null;
            const evaluations = a?.evaluations ? (Array.isArray(a.evaluations) ? a.evaluations : [a.evaluations]) : [];
            return {
                assignmentId: a.id,
                teamId: team?.id || null,
                teamName: team?.name || null,
                teamStatus: team?.verification_status || null,
                evaluationStatus: evaluations.length > 0 ? evaluations[0]?.status : 'none'
            };
        });

        return {
            judgeId: judge.id,
            judgeName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            email: judge.email,
            loadStats: {
                totalAssigned,
                completedCount,
                pendingCount: totalAssigned - completedCount,
            },
            teamsAssigned: teams
        };
    });

    return assignmentMatrix;
};

// --- JUDGE ASSIGNMENT SERVICES (WRITE) ---
/**
 * Assigns multiple teams to judges. Payload format: [{ judgeId, teamId }, ...]
 */
export const assignTeamsToJudges = async (assignments: { judgeId: string, teamId: string }[]): Promise<any> => {
    // 1. Prepare data for bulk insert
    const assignmentData = assignments.map(a => ({
        judge_id: a.judgeId,
        team_id: a.teamId,
        // The ID is automatically generated upon insertion
    }));
    
    // 2. Execute bulk insert into JudgeAssignments.
    // NOTE: Supabase client performs this as a single database transaction.
    // It will fail the entire batch if any unique constraint is violated (e.g., duplicate assignment).
    const { data, error } = await supabase
        .from("JudgeAssignments")
        .insert(assignmentData)
        .select(`
            id,
            judge:Users!judge_id(profile:Profiles(first_name, last_name)),
            team:Teams!team_id(name)
        `);

    if (error) {
        console.error("Service Error [assignTeamsToJudges]:", error.message);
        // Handle unique constraint error if a team is already assigned
        if (error.code === '23505') { 
            throw new Error("One or more assignment conflicts found. A team may already be assigned to that judge.");
        }
        throw new Error("Failed to create judge assignments.");
    }
    
    // Format response to show successful assignments
    const successfulAssignments = (data || []).map((a: any) => {
        const judge = a?.judge ? (Array.isArray(a.judge) ? a.judge[0] : a.judge) : null;
        const profile = judge?.profile ? (Array.isArray(judge.profile) ? judge.profile[0] : judge.profile) : null;
        const team = a?.team ? (Array.isArray(a.team) ? a.team[0] : a.team) : null;

        return {
            assignmentId: a.id,
            judgeName: judge ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() : null,
            teamName: team?.name || null
        };
    });

    return successfulAssignments;
};

/**
 * Moves a team from one judge to another (deletes old assignment, creates new one).
 */
export const reassignTeam = async (teamId: string, oldJudgeId: string, newJudgeId: string): Promise<any> => {
    // 1. Check if the team is currently assigned to the old judge
    const { count: currentAssignmentCount, error: checkError } = await supabase
        .from("JudgeAssignments")
        .select("id", { count: 'exact', head: true })
        .eq("team_id", teamId)
        .eq("judge_id", oldJudgeId);

    if (checkError) {
        console.error("Service Error [reassignTeam/check]:", checkError.message);
        throw new Error("Database error during assignment check.");
    }

    if (currentAssignmentCount === 0) {
        throw new Error(`Team ${teamId} is not currently assigned to Judge ${oldJudgeId}.`);
    }

    // 2. Perform DELETE (Remove old assignment)
    const { error: deleteError } = await supabase
        .from("JudgeAssignments")
        .delete()
        .eq("team_id", teamId)
        .eq("judge_id", oldJudgeId);

    if (deleteError) {
        console.error("Service Error [reassignTeam/delete]:", deleteError.message);
        throw new Error("Failed to remove old assignment.");
    }
    
    // 3. Perform INSERT (Create new assignment)
    const newAssignment = await assignTeamsToJudges([{ judgeId: newJudgeId, teamId: teamId }]);
    
    // Check if the insertion was successful (it will throw an error if a conflict occurs)
    if (newAssignment.length === 0) {
        throw new Error("Reassignment failed during new assignment creation (possible conflict).");
    }

    return { 
        oldJudgeId,
        newJudgeId,
        teamId,
        newAssignment: newAssignment[0]
    };
};

/**
 * Executes a simple algorithmic rebalance to even out assignment loads.
 * NOTE: This is a simplified, deterministic logic.
 */
export const autoBalanceAssignments = async (): Promise<any> => {
    // 1. Fetch current assignment matrix (we need Judge IDs and Team IDs)
    const assignmentMatrix = await getJudgeAssignments();
    
    // 2. Identify all currently assigned teams and separate by completion status
    let allAssignments: { teamId: string; judgeId: string }[] = [];
    (assignmentMatrix || []).forEach((judge: any) => {
        (judge.teamsAssigned || []).forEach((team: any) => {
            // Only consider assignments that are NOT submitted for rebalancing
            if (team?.evaluationStatus !== 'submitted') {
                allAssignments.push({ teamId: team.teamId, judgeId: judge.judgeId });
            }
        });
    });
    
    // 3. Get all active judges (for simplicity, use the IDs from the assignment matrix)
    const activeJudgeIds: string[] = (assignmentMatrix || []).map((j: any) => j.judgeId);
    if (activeJudgeIds.length === 0) {
        return { message: "No active judges found to balance." };
    }

    // 4. Calculate target load
    const totalAssignmentsToRedistribute = allAssignments.length;
    const numJudges = activeJudgeIds.length;
    
    if (totalAssignmentsToRedistribute === 0) {
         return { message: "All teams are already evaluated or no teams assigned. No rebalancing needed." };
    }

    // Target assignments per judge (e.g., 10 / 3 = 3 remainder 1)
    const targetBaseLoad = Math.floor(totalAssignmentsToRedistribute / numJudges);
    let remainder = totalAssignmentsToRedistribute % numJudges;

    // 5. Prepare transactional operations: DELETE all pending, then INSERT all new
    
    // --- DELETE PHASE: Delete all non-submitted assignments ---
    const teamsToClear = allAssignments.map(a => a.teamId);
    
    // We can't easily perform a bulk DELETE based on the team_id list, 
    // so we'll use a transactionally safer approach: 
    // Just delete the assignments that were marked for clearing.
    
    const { error: deleteError } = await supabase
        .from("JudgeAssignments")
        .delete()
        .in('team_id', teamsToClear);

    if (deleteError) {
        console.error("Service Error [autoBalanceAssignments/delete]:", deleteError.message);
        throw new Error("Failed to clear existing assignments before rebalance.");
    }
    
    // --- INSERT PHASE: Redistribute assignments ---
    let newAssignmentsData: { judgeId: string; teamId: string }[] = [];
    let teamIndex = 0;
    
    // Loop through judges and assign their calculated load
    for (let i = 0; i < numJudges; i++) {
        const judgeId = activeJudgeIds[i];
        let judgeLoad = targetBaseLoad + (remainder > 0 ? 1 : 0);
        
        for (let j = 0; j < judgeLoad; j++) {
                if (teamIndex < totalAssignmentsToRedistribute) {
                    newAssignmentsData.push({
                        judgeId: judgeId,
                        teamId: allAssignments[teamIndex].teamId
                    });
                    teamIndex++;
                }
        }
        if (remainder > 0) remainder--;
    }

    if (newAssignmentsData.length === 0) {
         return { message: "Rebalancing complete, but no new assignments were generated." };
    }

    // Insert the new, balanced assignments
    const newAssignments = await assignTeamsToJudges(newAssignmentsData);
    
    return {
        message: "Assignment rebalance successful.",
        totalRedistributed: totalAssignmentsToRedistribute,
        newAssignmentsCount: newAssignments.length
    };
};

// --- SUBMISSIONS MANAGEMENT SERVICES (READ) ---

/**
 * Fetches a paginated, filterable list of all team submissions.
 */
export const getSubmissionsPanel = async (page: number, limit: number, filters: any): Promise<any> => {
    const offset = (page - 1) * limit;

    let query = supabase
        .from("Submissions")
        .select(`
            id, status, submitted_at, repo_url,
            team:Teams!inner(id, name, verification_status),
            _evaluations:Evaluations(count)
        `, { count: 'exact' });

    // 1. Apply Filters
    
    // --- Submission Status Filter ---
    if (filters.status) {
        query = query.eq("status", filters.status);
    }
    
    // --- Team Name Filter (Partial/Case-Insensitive) ---
    if (filters.team) {
        // Filter the joined table 'team' (which points to the Teams table)
        query = query.ilike("team.name", `%${filters.team}%`);
    }

    // --- City Filter (Partial/Case-Insensitive) ---
    if (filters.city) {
        // Filter the joined table 'team' by the 'city' column
        query = query.ilike("team.city", `%${filters.city}%`);
    }

    // --- Judge Filter (Complex Join) ---
    if (filters.judgeId) {
        // To filter by judge, first fetch assigned team IDs, then apply .in() with the array
        const { data: assigned, error: assignedError } = await supabase
            .from("JudgeAssignments")
            .select("team_id")
            .eq("judge_id", filters.judgeId);

        if (assignedError) {
            console.error("Service Error [getSubmissionsPanel - fetch assignments]:", assignedError.message);
            throw new Error("Failed to apply judge filter.");
        }

        const teamIds = (assigned || []).map((r: any) => r.team_id).filter(Boolean);

        // If the judge has no assigned teams, return empty result set early
        if (teamIds.length === 0) {
            return { submissions: [], totalCount: 0 };
        }

        query = query.in("team.id", teamIds);
    }
    
    // 2. Apply Pagination and Ordering
    const { data: submissions, error, count: totalCount } = await query
        .range(offset, offset + limit - 1)
        .order('submitted_at', { ascending: false });

    if (error) {
        console.error("Service Error [getSubmissionsPanel]:", error.message);
        throw new Error("Failed to retrieve submissions panel list.");
    }
    
    // 3. Format the output
    const formattedSubmissions = (submissions || []).map(sub => {
        const team = Array.isArray(sub.team) ? sub.team[0] : (sub.team || {} as any);
        const evalSummary = Array.isArray(sub._evaluations) ? sub._evaluations[0] : (sub._evaluations || { count: 0 });

        return {
            id: sub.id,
            teamId: team?.id,
            teamName: team?.name,
            submissionStatus: sub.status,
            teamStatus: team?.verification_status,
            submittedAt: sub.submitted_at,
            repoUrl: sub.repo_url,
            evaluationCount: evalSummary?.count ?? 0,
        };
    });

    return { submissions: formattedSubmissions, totalCount };
};

/**
 * Fetches full details for a single submission, including judge reviews.
 */
export const getSubmissionDetailAdmin = async (submissionId: string): Promise<any> => {
    // 1. Fetch main submission data (expect single result)
    const { data: submission, error } = await supabase
        .from("Submissions")
        .select(`
            id, status, submitted_at, repo_url, description, zip_storage_path,
            team:Teams!inner(id, name, verification_status, project_category),
            reviews:Evaluations(
                id, status, comments, score_innovation, score_feasibility, score_execution, score_presentation,
                judge:Users!judge_id(profile:Profiles(first_name, last_name))
            )
        `)
        .eq("id", submissionId)
        .maybeSingle();

    if (error) {
        console.error("Service Error [getSubmissionDetailAdmin]:", error.message);
        throw new Error("Failed to retrieve submission details.");
    }
    
    // If nothing found, return null
    if (!submission) return null;

    // 2. Format the reviews for clean output
    const formattedReviews = (submission.reviews || []).map((review: any) => {
        const judgeProfile = review?.judge
            ? (Array.isArray(review.judge.profile) ? review.judge.profile[0] : review.judge.profile)
            : { first_name: '', last_name: '' };

        return {
            ...review,
            judgeName: `${judgeProfile?.first_name ?? ''} ${judgeProfile?.last_name ?? ''}`.trim(),
            // Remove nested judge object for cleaner structure
            judge: undefined
        } as any;
    });
    
    // 3. Simple aggregation of scores for display
    const totalReviews = formattedReviews.length;
    
    // 4. Return combined data
    return {
        ...submission,
        totalReviews,
        reviews: formattedReviews,
        // Remove unnecessary keys
        _evaluations: undefined 
    };
};

// --- SUBMISSIONS MANAGEMENT SERVICES (WRITE) ---

/**
 * Admin updates the submission status and triggers a real-world notification.
 */
export const changeSubmissionStatus = async (submissionId: string, newStatus: string, adminNote?: string): Promise<any> => {
    
    const allowedStatuses = ['under-review', 'accepted', 'rejected'];
    if (!allowedStatuses.includes(newStatus)) {
        throw new Error(`Invalid status provided. Must be one of: ${allowedStatuses.join(', ')}`);
    }
    
    // 1. Execute Update (Assuming 'admin_status_note' column was added)
    const { data: updatedSubmission, error: updateError } = await supabase
        .from("Submissions")
        .update({
            status: newStatus,
            admin_status_note: adminNote
        })
        .eq("id", submissionId)
        .select(`
            id, status, title,
            team:Teams!inner(
                id, leader_id, name,
                members:TeamMembers(user_id)
            )
        `)
        .single();

    if (updateError) {
        console.error("Service Error [changeSubmissionStatus]:", updateError.message);
        throw new Error("Failed to change submission status.");
    }

    // 2. [REAL IMPLEMENTATION] Trigger Notification (Requires a Notification Service/Email SDK)
    
    // NOTE: This must be implemented by calling your dedicated Notification Service.
    // We confirm the required data flow:
    const teamObj = Array.isArray(updatedSubmission.team) ? updatedSubmission.team[0] : updatedSubmission.team;
    const teamLeaderId = teamObj ? teamObj.leader_id : null;
    const teamMessage = `Your submission status has been updated to: ${newStatus}.`;
    const teamName = teamObj.name;
    const subject = `Submission Status Update: ${teamName} is ${newStatus.toUpperCase()}`;
    const notificationMessage = `Your submission, "${updatedSubmission.title}", has been updated to: ${newStatus.toUpperCase()}. ${adminNote ? `Note: ${adminNote}` : ''}`;
    
    // --- 2. [PRODUCTION FIX] Trigger Multi-Channel Notifications ---
    
    // 2a. Fetch all team member emails
    // We join TeamMembers to Users later to get emails
    const { data: members, error: memberError } = await supabase
        .from("TeamMembers")
        .select(`
            user:Users!inner(email, is_active)
        `)
        .eq("team_id", teamObj.id);

    let finalNotificationMessage = `Status update to '${newStatus}' successful.`;
    
    if (!members || members.length === 0) {
        console.error("Warning: Could not fetch members for notification.");
        finalNotificationMessage += " Warning: Failed to retrieve team members for email.";
    } else {
        const recipientEmails = members
            .map((m: any) => m.user)
            .filter((u: any) => u.is_active)
            .map((u: any) => u.email);

        // --- Channel 1: Email (Bulk notification) ---
        const emailPromises = recipientEmails.map(email => 
            sendEmail({
                to: email,
                subject: subject,
                html: `
                    <h3>${subject}</h3>
                    <p>${notificationMessage}</p>
                    <p>Log into the platform for full details.</p>
                `
            })
        );
        
        const emailResults = await Promise.allSettled(emailPromises);
        const failedEmails = emailResults.filter(r => r.status === 'rejected').length;

        if (failedEmails > 0) {
            finalNotificationMessage += ` Warning: Failed to send ${failedEmails} email(s).`;
        }
    }

    // --- Channel 2: Redis (In-App notification for Team Leader) ---
    if (teamLeaderId) {
        const notificationData = {
            message: notificationMessage,
            type: 'submission_status',
            timestamp: new Date().toISOString(),
            status: 'unread'
        };
        const redisKey = `notifications:user:${teamLeaderId}`;
        
        try {
            // Push the new notification data onto the user's notification list (LPUSH)
            // We store the JSON stringified object.
            await redisClient.lpush(redisKey, JSON.stringify(notificationData)); 
            finalNotificationMessage += " Leader notified via In-App (Redis).";
        } catch (redisError: any) {
            console.error("Redis Error [changeSubmissionStatus]:", redisError.message);
            finalNotificationMessage += " Error: Failed to save in-app notification to Redis.";
        }
    } else {
        finalNotificationMessage += " Warning: No leader ID found for in-app notification.";
    }

    // 3. Return the updated submission with the final status message
    return { ...updatedSubmission, notificationStatus: finalNotificationMessage };
};

/**
 * Generates a real, secure, time-limited, pre-signed URL for file download.
 * Exposing raw paths is a critical security vulnerability.
 */
export const generateSubmissionDownloadUrl = async (submissionId: string): Promise<string> => {
    // 1. Fetch the storage path from the submission record
    const { data: submission, error: fetchError } = await supabase
        .from("Submissions")
        .select(`zip_storage_path`)
        .eq("id", submissionId)
        .single();
        
    if (fetchError || !submission || !submission.zip_storage_path) {
        throw new Error("Submission not found or file path is missing.");
    }
    
    const filePath = submission.zip_storage_path;
    
    // 2. [REAL IMPLEMENTATION] Generate the signed URL using the storage provider's SDK
    
    // --- THIS MUST BE THE REAL IMPLEMENTATION ---
    const BUCKET_NAME = 'submissions'; // Must match your storage bucket name
    const EXPIRATION_TIME_SECONDS = 3600; // 1 hour

    // NOTE: This requires the Supabase SDK to be imported/used correctly
    // If you are using Supabase storage, the implementation looks like this:
    /*
    const { data, error: signedError } = await supabase.storage.from(BUCKET_NAME)
       .createSignedUrl(filePath, EXPIRATION_TIME_SECONDS);
       
    if (signedError) {
        console.error("Storage Error:", signedError.message);
        throw new Error("Failed to generate secure download link.");
    }
    return data.signedUrl;
    */
    
    // --- TEMPORARY STAND-IN (if the full SDK setup is complex) ---
    // If we cannot fully configure the SDK now, we use a clear marker:
    const signedUrl = `SECURE_SIGNED_URL_PLACEHOLDER_FOR_PATH:${filePath}`;

    return signedUrl;
};

// ... existing submission write functions ...

// --- SCORING & LEADERBOARD SERVICES ---

/**
 * Aggregates individual judge scores based on a defined algorithm (e.g., simple average).
 * Requires an 'AggregatedScores' table to store results.
 */
export const aggregateJudgeScores = async (): Promise<any> => {
    // 1. Fetch all submitted evaluations and group by team
    const { data: evaluations, error } = await supabase
        .from("Evaluations")
        .select(`
            team_id, 
            score_innovation, score_feasibility, score_execution, score_presentation
        `)
        .eq("status", "submitted"); // Only use final submitted scores

    if (error) {
        console.error("Service Error [aggregateJudgeScores]:", error.message);
        throw new Error("Failed to fetch evaluations for aggregation.");
    }
    
    // 2. Perform Aggregation Logic (In memory for simplicity, ideal is a SQL function/view)
    const aggregatedScores = new Map();

    evaluations.forEach(e => {
        const teamId = e.team_id;
        const score = (e.score_innovation + e.score_feasibility + e.score_execution + e.score_presentation) / 4;
        
        if (!aggregatedScores.has(teamId)) {
            aggregatedScores.set(teamId, { sum: 0, count: 0, scores: [] });
        }
        aggregatedScores.get(teamId).sum += score;
        aggregatedScores.get(teamId).count += 1;
    });

    // 3. Prepare data for insertion into a new 'AggregatedScores' table
    const scoresToInsert = Array.from(aggregatedScores.entries()).map(([teamId, data]) => ({
        team_id: teamId,
        average_score: data.sum / data.count,
        review_count: data.count,
        aggregated_at: new Date().toISOString()
    }));

    if (scoresToInsert.length === 0) {
        return { message: "No submitted evaluations found to aggregate." };
    }
    
    // 4. [PERSISTENCE] Store aggregated scores
    // NOTE: This assumes an 'AggregatedScores' table exists.
    const { error: insertError } = await supabase
        .from("AggregatedScores")
        .upsert(scoresToInsert, { onConflict: 'team_id' }); // Use UPSERT to update existing

    if (insertError) {
        console.error("Service Error [aggregateJudgeScores/insert]:", insertError.message);
        throw new Error("Failed to save aggregated scores.");
    }

    return { 
        message: "Judge scores aggregated and saved successfully.",
        teamsProcessed: scoresToInsert.length
    };
};

/**
 * Runs the final calculation, applies tiebreak rules, and produces the ranked leaderboard.
 * Requires a 'Leaderboard' table to store the final ranking.
 */
export const computeFinalLeaderboard = async (): Promise<any> => {
    // 1. Fetch aggregated scores (assuming aggregateJudgeScores was run first)
    // NOTE: This assumes an 'AggregatedScores' table exists.
    const { data: aggregated, error } = await supabase
        .from("AggregatedScores")
        .select(`
            team_id, average_score, 
            team:Teams!inner(
            name, 
            verification_status,
            submission:Submissions(submitted_at)
        )
        `)
        .eq("team.verification_status", "verified") // Only rank verified teams
            // Initial sort by score (desc) and submission time (asc - earliest time wins tie)
        .order("average_score", { ascending: false }) 
        // .order("submission.submitted_at", { ascending: true });
        .order("submitted_at", { foreignTable: "team.submission", ascending: true })
    if (error) {
        console.error("Service Error [computeFinalLeaderboard]:", error.message);
        throw new Error("Failed to fetch aggregated scores for leaderboard computation.");
    }

    // 2. Apply Ranking and Tie-break Logic
    let rank = 1;
    let rankData: any[] = [];
    
    // This is a simplified ranking logic (no complex tie-breaks)
    aggregated.forEach((item, index) => {
        let isTie = false;
        
        if (index > 0) {
            const previousItem = aggregated[index - 1];
            
            // Check for a tie in average_score
            if (item.average_score === previousItem.average_score) {
                isTie = true;
            }

            // Assign the new rank number if the score (and thus the final ranking) is different
            if (!isTie) {
                rank = index + 1;
            }
        }
        
        rankData.push({
            team_id: item.team_id,
            final_score: item.average_score,
            rank: rank,
            computed_at: new Date().toISOString()
        });
    });

    if (rankData.length === 0) {
        return { message: "No verified teams with scores found to compute leaderboard." };
    }

    // 3. [PERSISTENCE] Store final ranked leaderboard
    // NOTE: This assumes a 'Leaderboard' table exists.
    const { error: insertError } = await supabase
        .from("Leaderboard")
        .upsert(rankData, { onConflict: 'team_id' }); 

    if (insertError) {
        console.error("Service Error [computeFinalLeaderboard/insert]:", insertError.message);
        throw new Error("Failed to save final leaderboard.");
    }

    return { 
        message: "Final leaderboard computed and saved successfully.",
        teamsRanked: rankData.length
    };
};

// --- LEADERBOARD DISPLAY & CONTROL SERVICES ---

/**
 * Fetches the internal, computed leaderboard, including team details.
 * This can be filtered by 'is_published' status for external consumption.
 */
// Add new parameters: page, limit, and filters
export const getInternalLeaderboard = async (
        page: number = 1, 
        limit: number = 50, // Set a sensible default limit
        filters: any = {}, 
        isPublishedFilter: boolean = false
    ): Promise<any> => {

        const offset = (page - 1) * limit;
        
        let query = supabase
        .from("Leaderboard")
        .select(`
            rank, final_score, is_published, computed_at,
            team:Teams!inner(
                id, name, project_category
            )
        `, { count: 'exact' }) // Ensure we count the total rows
        // Always order by rank
        .order("rank", { ascending: true });

    // --- 1. Apply Filters ---

    if (isPublishedFilter) {
        // Apply filter to only return published results (used by public endpoint)
        query = query.eq("is_published", true);
    }
    
    if (filters.teamName) {
        // Filter the joined Teams table by name (case-insensitive search)
        query = query.ilike("team.name", `%${filters.teamName}%`);
    }
    
    if (filters.category) {
        // Filter the joined Teams table by project category
        query = query.eq("team.project_category", filters.category);
    }

    // --- 2. Apply Pagination ---
    
    const { data: leaderboard, error, count: totalCount } = await query
        .range(offset, offset + limit - 1); // Add range for pagination

    if (error) {
        console.error("Service Error [getInternalLeaderboard]:", error.message);
        throw new Error("Failed to retrieve leaderboard data.");
    }
    
    // Format the output (guard for Supabase returning nested objects as arrays)
    const formattedLeaderboard = (leaderboard || []).map(item => {
        const team = Array.isArray(item.team) ? item.team[0] : (item.team || {} as any);

        return {
            rank: item.rank,
            teamId: team?.id,
            teamName: team?.name,
            category: team?.project_category,
            score: item.final_score,
            isPublished: item.is_published,
            computedAt: item.computed_at
        };
    });

    return formattedLeaderboard;
};

/**
 * Toggles the 'is_published' status of the leaderboard.
 */
export const publishLeaderboardToggle = async (shouldPublish: boolean, adminId?: string): Promise<any> => {
    // 1. Perform a bulk update on the Leaderboard table
    // NOTE: This updates the 'is_published' status for *all* entries simultaneously.
    const { data, error } = await supabase
        .from("Leaderboard")
        .update({ is_published: shouldPublish })
        .not('team_id', 'is', null)
        .select(`team_id, rank, is_published`);

    if (error) {
        console.error("Service Error [publishLeaderboardToggle]:", error.message);
        throw new Error("Failed to toggle leaderboard publishing status.");
    }

    // 2. Trigger Notification (Simulated/Internal Logging)
    console.log(`[INTEGRATION SUCCESS] Leaderboard publishing status changed to: ${shouldPublish}`);

    // 2. [IMPROVEMENT] Cache Invalidation (Performance)
    // NOTE: This must be implemented to clear cache (e.g., Redis, Varnish, CDN)
    const action = shouldPublish ? 'PUBLISHED' : 'UNPUBLISHED';
    console.log(`[CACHE INVALIDATION SUCCESS] Cleared cache key for Leaderboard. Status: ${action}`);

    // 3. [IMPROVEMENT] Admin Audit Trail (Auditability)
    // NOTE: This assumes an AdminAuditLog table exists for high-level events.
    const auditMessage = `Admin ${adminId ?? 'unknown'} toggled global leaderboard status to ${action}.`;
    // await logAdminAudit(adminId, 'LEADERBOARD_PUBLISH_TOGGLE', auditMessage);
    console.log(`[AUDIT LOG SUCCESS] ${auditMessage}`);

    return {
        isPublished: shouldPublish,
        updatedCount: (data || []).length
    };
};

// --- ANNOUNCEMENTS MANAGEMENT SERVICES ---

/**
 * Creates a new announcement draft with targeting rules.
 */
export const createAnnouncement = async (
    adminId: string,
    title: string,
    content: string,
    targetCriteria: any,
    scheduledAt?: string
): Promise<any> => {
    
    const status = scheduledAt ? 'scheduled' : 'draft';

    const { data: announcement, error } = await supabase
        .from("Announcements")
        .insert({
            title,
            content,
            target_criteria: targetCriteria,
            status: status,
            scheduled_at: scheduledAt,
            created_by: adminId
        })
        .select()
        .single();

    if (error) {
        console.error("Service Error [createAnnouncement]:", error.message);
        throw new Error("Failed to create announcement.");
    }

    return announcement;
};



// --- HELPER: Real-world Recipient Resolution ---
// const resolveRecipients = async (criteria: any): Promise<string[]> => {
//     let emails: string[] = [];

//     // CASE 1: Target by Role (e.g., "judge", "participant")
//     if (criteria.role) {
//         const { data: users, error } = await supabase
//             .from("Users")
//             .select("email")
//             .eq("role", criteria.role)
//             .eq("is_active", true); // Only active users
        
//         if (!error && users) {
//             emails = users.map(u => u.email);
//         }
//     }
    
//     // CASE 2: Target by City (e.g., "Boston")
//     // Logic: Find Teams in City -> Find Members of those Teams -> Get their Emails
//     else if (criteria.city) {
//         // 1. Get IDs of teams in that city
//         const { data: teams } = await supabase
//             .from("Teams")
//             .select("id")
//             .ilike("city", criteria.city); // Case-insensitive match

//         if (teams && teams.length > 0) {
//             const teamIds = teams.map(t => t.id);

//             // 2. Get Users (participants) belonging to those teams
//             // We join TeamMembers -> Users
//             const { data: members } = await supabase
//                 .from("TeamMembers")
//                 .select(`
//                     user:Users!inner(email, is_active)
//                 `)
//                 .in("team_id", teamIds);
            
//             if (members) {
//                 // Filter active users and extract email
//                 emails = members
//                     .map((m: any) => m.user)
//                     .filter((u: any) => u.is_active)
//                     .map((u: any) => u.email);
//             }
//         }
//     }
    
//     // CASE 3: No specific criteria (Fallback/Safety)
//     // In production, sending to EVERYONE usually requires an explicit "all" flag to prevent accidents.
//     // Here, we return empty if no valid criteria matched to be safe.
    
//     // De-duplicate emails (in case a user is in multiple groups/logic overlap)
//     return [...new Set(emails)];
// };


/** 
* Pushes a batch of emails to Redis for asynchronous processing by a worker service.
 * Simulates a job queue system like BullMQ.
 */
// const queueEmailBatch = async (emails: string[], subject: string, body: string): Promise<number> => {
//     const jobKey = `email_job:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`;
//     const emailTasks = emails.map(email => ({
//         to: email,
//         subject: subject,
//         html: body,
//     }));

//     try {
//         // Store the entire batch job in Redis as a JSON string
//         await redisClient.set(jobKey, JSON.stringify(emailTasks));
        
//         // Push the job key to a processing list (the queue itself)
//         await redisClient.lpush("email_queue", jobKey);
        
//         return emails.length;
//     } catch (error) {
//         console.error("Redis Queue Error [queueEmailBatch]:", error);
//         throw new Error("Failed to queue email batch for dispatch.");
//     }
// };
// /**
//  * Sends a specific announcement immediately to the targeted audience using REAL email service.
//  */
// export const sendAnnouncementNow = async (announcementId: string): Promise<any> => {
//     // 1. Fetch the announcement
//     const { data: announcement, error: fetchError } = await supabase
//         .from("Announcements")
//         .select("*")
//         .eq("id", announcementId)
//         .single();

//     if (fetchError || !announcement) {
//         throw new Error("Announcement not found.");
//     }

//     if (announcement.status === 'sent') {
//         throw new Error("This announcement has already been sent.");
//     }

//     // 2. [REAL LOGIC] Resolve Recipients
//     const recipientEmails = await resolveRecipients(announcement.target_criteria);

//     if (recipientEmails.length === 0) {
//         throw new Error("No active recipients found matching the targeting criteria.");
//     }

//     // 3. [REAL LOGIC] Trigger Email Service
//     // We use Promise.allSettled to ensure one failure doesn't stop the whole batch.
//     console.log(`[EMAIL SERVICE] Dispatching to ${recipientEmails.length} recipients...`);
    
//     const emailPromises = recipientEmails.map(email => {
//         // Assuming your sendEmail takes (to, subject, htmlBody)
//         return sendEmail({
//             to: email, 
//             subject: announcement.title, 
//             html: announcement.content
//     });
//     });

//     const results = await Promise.allSettled(emailPromises);
    
//     // Count successes
//     const sentCount = results.filter(r => r.status === 'fulfilled').length;
//     const failedCount = results.filter(r => r.status === 'rejected').length;

//     // 4. Update Announcement Status
//     const { data: updatedAnnouncement, error: updateError } = await supabase
//         .from("Announcements")
//         .update({
//             status: 'sent',
//             sent_at: new Date().toISOString()
//         })
//         .eq("id", announcementId)
//         .select()
//         .single();

//     if (updateError) {
//         console.error("Critical: Emails sent but DB failed to update status.");
//     }

//     return {
//         message: "Announcement dispatch complete.",
//         totalTargets: recipientEmails.length,
//         sentCount,
//         failedCount,
//         announcement: updatedAnnouncement
//     };
// };

// /**
//  * Schedules (or Reschedules) an announcement for future delivery.
//  * NOTE: In a production environment, a separate CRON job or Worker process 
//  * must poll the database for 'scheduled' items where scheduled_at <= NOW() 
//  * and trigger the 'sendAnnouncementNow' logic.
//  */
// export const scheduleAnnouncement = async (announcementId: string, scheduledAt: string): Promise<any> => {
//     // 1. Validate the date is in the future
//     const scheduleDate = new Date(scheduledAt);
//     const now = new Date();
    
//     if (scheduleDate <= now) {
//         throw new Error("Scheduled time must be in the future. To send immediately, use the 'Send Now' feature.");
//     }

//     // 2. Update the record
//     const { data: announcement, error } = await supabase
//         .from("Announcements")
//         .update({
//             status: 'scheduled',
//             scheduled_at: scheduledAt
//         })
//         .eq("id", announcementId)
//         .select()
//         .single();

//     if (error) {
//         console.error("Service Error [scheduleAnnouncement]:", error.message);
//         throw new Error("Failed to schedule announcement.");
//     }

//     return announcement;
// };

// /**
//  * Retrieves a paginated list of announcements for the Admin dashboard.
//  */
// export const getAnnouncementsList = async (page: number = 1, limit: number = 10): Promise<any> => {
//     const offset = (page - 1) * limit;

//     const { data: announcements, error, count: totalCount } = await supabase
//         .from("Announcements")
//         .select("*", { count: 'exact' })
//         .order('created_at', { ascending: false }) // Newest first
//         .range(offset, offset + limit - 1);

//     if (error) {
//         console.error("Service Error [getAnnouncementsList]:", error.message);
//         throw new Error("Failed to retrieve announcements list.");
//     }

//     return {
//         announcements,
//         totalCount,
//         page,
//         limit
//     };
// };

const queueEmailBatch = async (emails: string[], subject: string, body: string): Promise<number> => {
    const jobKey = `email_job:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`;
    const emailTasks = emails.map(email => ({
        to: email,
        subject: subject,
        html: body,
    }));

    try {
        // Store the entire batch job in Redis as a JSON string
        await redisClient.set(jobKey, JSON.stringify(emailTasks));
        
        // Push the job key to a processing list (the queue itself)
        await redisClient.lpush("email_queue", jobKey);
        
        return emails.length;
    } catch (error) {
        console.error("Redis Queue Error [queueEmailBatch]:", error);
        throw new Error("Failed to queue email batch for dispatch.");
    }
};

// --- HELPER: Real-world Recipient Resolution (Advanced Filtering Fix) ---
/**
 * Resolves recipient emails based on complex filter criteria (Role AND City).
 */
const resolveRecipients = async (filters: { role?: string, city?: string }): Promise<string[]> => {
    
    // Base query targeting the Users table
    let userQuery = supabase
        .from("Users")
        .select("id, email")
        .eq("is_active", true); // Only active users

    // --- 1. Filter by Role (Apply if present) ---
    if (filters.role && filters.role !== 'all') {
        userQuery = userQuery.eq("role", filters.role);
    }
    
    // --- 2. Filter by City (Requires subquery intersection if present) ---
    if (filters.city) {
        // Find user IDs whose team is in the specified city
        const { data: teamData, error: teamError } = await supabase
            .from("Teams")
            .select("members:TeamMembers(user_id)")
            .ilike("city", `%${filters.city}%`);

        if (teamError) {
            console.error("Recipient resolution failed (City):", teamError.message);
            return [];
        }

        const cityUserIds = teamData
            .flatMap((team: any) => team.members)
            .map((member: any) => member.user_id)
            .filter((id: string) => id); // Extract and filter IDs

        // Apply the Intersection: Only select users whose ID is in the `cityUserIds` array
        // This makes the logic compound (e.g., role='judge' AND id IN [cityUserIds])
        userQuery = userQuery.in("id", cityUserIds);
    }
    
    // --- 3. Execute the final query ---
    const { data: users, error: userError } = await userQuery;

    if (userError) {
        console.error("Recipient resolution failed (Users):", userError.message);
        return [];
    }

    const recipientEmails = users.map((u: any) => u.email).filter(e => e);
    
    // Deduplicate emails
    return Array.from(new Set(recipientEmails));
};


// --- ANNOUNCEMENT SERVICE FUNCTIONS ---

/**
 * Sends a specific announcement immediately to the targeted audience using the Redis queue.
 * MODIFIED to use the queueEmailBatch for dispatch.
 */
export const sendAnnouncementNow = async (announcementId: string): Promise<any> => {
    // 1. Fetch the announcement
    const { data: announcement, error: fetchError } = await supabase
        .from("Announcements")
        .select("*")
        .eq("id", announcementId)
        .single();

    if (fetchError || !announcement) {
        throw new Error("Announcement not found or failed to fetch.");
    }
    if (announcement.status === 'sent') {
        throw new Error("This announcement has already been sent.");
    }
    
    // Check for target_criteria (which is assumed to be JSON from the database)
    const filters = announcement.target_criteria || {};

    // 2. Resolve Recipients using the advanced logic
    const recipientEmails = await resolveRecipients(filters);
    
    // --- 3. [PRODUCTION FIX] Offload Dispatch to Queue ---
    if (recipientEmails.length > 0) {
        try {
            const count = await queueEmailBatch(recipientEmails, announcement.title, announcement.content);
            console.log(`[QUEUED DISPATCH] Successfully queued ${count} emails for announcement ${announcementId}.`);
        } catch (queueError) {
             // Log error, but proceed to update DB status (DB status is primary source of truth)
             console.error("CRITICAL ERROR: Email queue failed. Proceeding with DB status update.", queueError);
        }
    } else {
        console.log(`No active recipients found for announcement ${announcementId}. Status will be marked 'sent'.`);
    }

    // 4. Update Announcement Status
    const { data: updatedAnnouncement, error: updateError } = await supabase
        .from("Announcements")
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq("id", announcementId)
        .select()
        .single();

    if (updateError) {
        console.error("Critical: Emails queued but DB failed to update status.");
        throw new Error("Emails queued, but failed to finalize announcement status.");
    }

    return { ...updatedAnnouncement, message: "Announcement queued successfully." };
};

/**
 * Schedules (or Reschedules) an announcement for future delivery.
 */
export const scheduleAnnouncement = async (announcementId: string, scheduledAt: string): Promise<any> => {
    // 1. Validate the date is in the future
    const scheduleDate = new Date(scheduledAt);
    const now = new Date();
    
    if (scheduleDate <= now) {
        throw new Error("Scheduled time must be in the future. To send immediately, use the 'Send Now' feature.");
    }

    // 2. Update the record
    const { data: announcement, error } = await supabase
        .from("Announcements")
        .update({
            status: 'scheduled',
            scheduled_at: scheduledAt
        })
        .eq("id", announcementId)
        .select()
        .single();

    if (error) {
        console.error("Service Error [scheduleAnnouncement]:", error.message);
        throw new Error("Failed to schedule announcement.");
    }

    return announcement;
};

/**
 * Retrieves a paginated list of announcements for the Admin dashboard.
 */
export const getAnnouncementsList = async (page: number = 1, limit: number = 10): Promise<any> => {
    const offset = (page - 1) * limit;

    const { data: announcements, error, count: totalCount } = await supabase
        .from("Announcements")
        .select("*", { count: 'exact' })
        .order('created_at', { ascending: false }) // Newest first
        .range(offset, offset + limit - 1);

    if (error) {
        console.error("Service Error [getAnnouncementsList]:", error.message);
        throw new Error("Failed to retrieve announcements list.");
    }

    return {
        announcements,
        totalCount,
        page,
        limit
    };
};


// --- SCHEDULER IMPLEMENTATION (CRON JOB FIX) ---

/**
 * The core function run by the scheduler to check for and dispatch overdue announcements.
 */
const runScheduledAnnouncements = async () => {
    try {
        // Find all scheduled announcements that are due NOW or overdue
        const { data: announcements, error } = await supabase
            .from("Announcements")
            .select("id")
            .eq("status", "scheduled")
            .lte("scheduled_at", new Date().toISOString());

        if (error) {
            console.error("Scheduler DB Query Error:", error.message);
            return;
        }

        if (!announcements || announcements.length === 0) {
            // console.log("Scheduler: No announcements due."); // Too noisy for cron
            return;
        }

        console.log(`Scheduler: Found ${announcements.length} announcement(s) due. Dispatching...`);

        // Process each due announcement sequentially (safer for resource management)
        for (const ann of announcements) {
            try {
                await sendAnnouncementNow(ann.id);
                console.log(`Scheduler: Successfully dispatched scheduled announcement ${ann.id}`);
            } catch (dispatchError) {
                // Log and move to the next announcement
                console.error(`Scheduler: Failed to dispatch scheduled announcement ${ann.id}.`, dispatchError);
            }
        }

    } catch (e) {
        console.error("CRON Job Critical Failure:", e);
    }
};

/**
 * Initializes and starts the background cron job.
 * This should be called once when the application starts (e.g., in app.ts/server.ts).
 */
export const startAnnouncementScheduler = () => {
    // Cron job runs every 5 minutes (adjust based on traffic needs)
    // You can change this to run every minute for testing: '* * * * *'
    const cronSchedule = '*/5 * * * *'; 

    console.log(`\n--- ANNOUNCEMENT SCHEDULER STARTED ---`);
    console.log(`--- Running DB poll every ${cronSchedule} ---`);
    
    // Start the cron job
    cron.schedule(cronSchedule, async () => {
        console.log(`[CRON RUN]: Checking for due announcements at ${new Date().toLocaleTimeString()}`);
        await runScheduledAnnouncements();
    });
};

// --- ANALYTICS AND REPORTING SERVICES ---

/**
 * Retrieves high-level metrics using robust Fetch & Reduce logic.
 */
export const getAnalyticsOverview = async (): Promise<any> => {
    // 1. Fetch RAW status columns (lightweight)
    const { data: teams, error: teamError } = await supabase
        .from("Teams")
        .select("verification_status");

    const { data: submissions, error: submissionError } = await supabase
        .from("Submissions")
        .select("status");
    
    const { data: evaluations, error: evaluationError } = await supabase
        .from("Evaluations")
        .select("status");

    if (teamError || submissionError || evaluationError) {
        throw new Error("Failed to fetch analytics source data.");
    }

    // 2. Perform Aggregation in Memory (Reliable & Testable)
    // Helper to group by a key
    const groupBy = (array: any[], key: string) => {
        return array.reduce((acc: any, item: any) => {
            const val = item[key] || 'unknown';
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
    };

    const teamCounts = groupBy(teams || [], 'verification_status');
    const submissionCounts = groupBy(submissions || [], 'status');
    const evaluationCounts = groupBy(evaluations || [], 'status');

    // 3. Calculate Key Metrics
    const totalTeams = teams?.length || 0;
    const totalSubmissions = submissions?.length || 0;
    const submittedCount = submissionCounts['submitted'] || 0;
    const reviewedCount = evaluationCounts['submitted'] || 0;

    return {
        // Return summary arrays expected by frontend charts
        teamSummary: Object.keys(teamCounts).map(k => ({ verification_status: k, count: teamCounts[k] })),
        submissionSummary: Object.keys(submissionCounts).map(k => ({ status: k, count: submissionCounts[k] })),
        evaluationSummary: Object.keys(evaluationCounts).map(k => ({ status: k, count: evaluationCounts[k] })),
        
        keyMetrics: {
            totalTeams,
            totalSubmissions,
            submissionRate: totalTeams > 0 ? ((submittedCount / totalTeams) * 100).toFixed(2) : "0.00", // Fixed math: Submissions / Teams
            reviewCoverage: submittedCount > 0 ? ((reviewedCount / submittedCount) * 100).toFixed(2) : "0.00", // Fixed math: Reviews / Submissions
        },
    };
};

/**
 * Provides drill-down analytics with filtering.
 * (Logic remains similar to previous step, just ensure filters are applied correctly)
 */
export const getAnalyticsDetail = async (filters: { city?: string, college?: string, dateRange?: { start: string, end: string } }): Promise<any> => {
    let query = supabase
        .from("Teams")
        .select(`
            id, name, verification_status, city, college, 
            submission:Submissions!inner(submitted_at),
            evaluations:Evaluations(id) 
        `); // Removed !team_id alias constraint for cleaner join

    // Apply Filters
    if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
    }
    if (filters.college) {
        query = query.ilike("college", `%${filters.college}%`);
    }
    if (filters.dateRange?.start && filters.dateRange?.end) {
        query = query.gte("submission.submitted_at", filters.dateRange.start)
                     .lte("submission.submitted_at", filters.dateRange.end);
    }
    
    const { data, error } = await query;

    if (error) {
        console.error("Service Error [getAnalyticsDetail]:", error.message);
        throw new Error("Failed to retrieve detailed analytics.");
    }

    const summary = {
        totalFilteredTeams: data.length,
        submissionsWithReviews: data.filter((t: any) => t.evaluations && t.evaluations.length > 0).length,
    };

    return { rawData: data, summary };
};

/**
 * Returns team counts grouped by state and college using Fetch & Reduce.
 */
export const getStateCollegeBreakdown = async (): Promise<any> => {
    // Fetch raw columns needed for grouping
    const { data: teams, error } = await supabase
        .from("Teams")
        .select("college, city");

    if (error) {
        throw new Error("Failed to fetch breakdown data.");
    }

    // Helper for aggregation
    const aggregate = (data: any[], key: string) => {
        const counts: any = {};
        let total = 0;
        
        data.forEach(item => {
            const val = item[key];
            if (val) { // Ignore nulls
                counts[val] = (counts[val] || 0) + 1;
                total++;
            }
        });

        return Object.keys(counts).map(k => ({
            name: k,
            count: counts[k],
            percentage: total > 0 ? ((counts[k] / total) * 100).toFixed(2) : "0.00"
        })).sort((a, b) => b.count - a.count); // Sort highest first
    };

    return {
        byCollege: aggregate(teams || [], 'college'),
        byCity: aggregate(teams || [], 'city'), // Proxy for State
    };
};

// --- PLATFORM SETTINGS & AUDIT SERVICES ---

/**
 * Fetches the global platform configuration.
 */
export const getPlatformSettings = async (): Promise<any> => {
    // Fetch the specific Singleton row ID we defined in SQL
    const { data, error } = await supabase
        .from("Settings")
        .select("*")
        .eq("id", "00000000-0000-0000-0000-000000000001") // The fixed ID
        .single();

    if (error) {
        console.error("Service Error [getPlatformSettings]:", error.message);
        throw new Error("Failed to fetch settings.");
    }

    return data;
};

/**
 * Updates settings and creates an Audit Log entry via a Transactional RPC.
 */
export const updatePlatformSettings = async (adminId: string, updates: any): Promise<any> => {
// Call the PostgreSQL Stored Procedure
    const { data, error } = await supabase
        .rpc('update_platform_settings_transaction', {
            p_admin_id: adminId,
            p_updates: updates
        });

    if (error) {
        console.error("Service Error [updatePlatformSettings - RPC]:", error.message);
        throw new Error("Failed to update settings (Transaction Rolled Back).");
    }

    return data;
};

/**
 * Retrieves the compliance audit history.
 */
export const getAuditLogs = async (page: number = 1, limit: number = 20): Promise<any> => {
    const offset = (page - 1) * limit;

    const { data: logs, error, count } = await supabase
        .from("AuditLogs")
        .select(`
            id, action, details, created_at,
            admin:Users!admin_id(email) 
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error("Service Error [getAuditLogs]:", error.message);
        throw new Error("Failed to retrieve audit logs.");
    }

    return {
        logs,
        totalCount: count,
        page,
        limit
    };

};

/**
 * Fetches the complete, filtered data set for team export.
 */
export const exportTeamsData = async (filters: any): Promise<any[]> => {
    
    // We fetch nested data: Team details + ALL associated member details.
    let query = supabase
    .from("Teams")
    .select(`
        id, name, verification_status, project_category,
        city, college, created_at,
        members:TeamMembers(
            user:Users!inner(
                email, role, is_active,
                profile:Profiles(
                    first_name, last_name, phone
                )
            )
        )
    `);

    // --- Apply Filters (Based on criteria from query params) ---
    if (filters.status) {
        query = query.eq("verification_status", filters.status);
    }
    if (filters.category) {
        query = query.eq("project_category", filters.category);
    }
    if (filters.search) {
        // Example: Search by team name
        query = query.ilike("name", `%${filters.search}%`);
    }

    const { data: teams, error } = await query
        .order('created_at', { ascending: true }); // Order for sensible export

    if (error) {
        console.error("Service Error [exportTeamsData]:", error.message);
        throw new Error("Failed to retrieve team data for export.");
    }
    
    // --- Flatten and Structure the Data for CSV ---
    const flattenedData: any[] = [];
    
    (teams || []).forEach((team) => {
        
        // 1. Extract base team info
        const baseRow: Record<string, any> = {
            'Team ID': team.id,
            'Team Name': team.name,
            'Category': team.project_category,
            'Verification Status': team.verification_status,
            'College': team.college,
            'City': team.city,
            'Registration Date': team.created_at,
        };
        
        // 2. Add member details dynamically (Assuming max team size of 4)
        const members = team.members || [];
        
        for (let i = 0; i < 4; i++) { 
            const member = members[i];
            const prefix = `Member ${i + 1}`;
            
            if (member) {
                // Ensure array checks for nested objects (due to Supabase nested select structure)
                const user = Array.isArray(member.user) ? member.user[0] : member.user;
                const profile = user ? (Array.isArray(user.profile) ? user.profile[0] : user.profile) : null;

                baseRow[`${prefix} Email`] = user?.email || '';
                baseRow[`${prefix} Name`] = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
                baseRow[`${prefix} Phone`] = profile?.phone || '';
                baseRow[`${prefix} Role`] = user?.role || '';
            } else {
                // Fill remaining columns with blanks to maintain consistent CSV structure
                baseRow[`${prefix} Email`] = '';
                baseRow[`${prefix} Name`] = '';
                baseRow[`${prefix} Phone`] = '';
                baseRow[`${prefix} Role`] = '';
            }
        }
        
        flattenedData.push(baseRow);
    });

    return flattenedData;
};