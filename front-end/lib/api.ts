// API utility functions for authentication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  recaptchaToken: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  error?: string;
  field?: string;
}

/**
 * Sign up a new user
 */
export async function signup(data: SignupData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        message: result.message || 'Signup failed',
        error: result.error || result.message,
        field: result.field,
      };
    }

    return result;
  } catch (error: any) {
    return {
      message: 'Network error. Please try again.',
      error: error.message,
    };
  }
}

/**
 * Log in a user
 */
export async function login(data: LoginData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        message: result.message || 'Login failed',
        error: result.error || result.message,
        field: result.field,
      };
    }

    return result;
  } catch (error: any) {
    return {
      message: 'Network error. Please try again.',
      error: error.message,
    };
  }
}

/**
 * Log out the current user
 */
export async function logout(): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    return { message: 'Logout failed' };
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        message: result.message || 'Verification failed',
        error: result.message,
      };
    }

    return result;
  } catch (error: any) {
    return {
      message: 'Network error. Please try again.',
      error: error.message,
    };
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        message: result.message || 'Failed to get user info',
        error: result.message,
      };
    }

    return result;
  } catch (error: any) {
    return {
      message: 'Network error. Please try again.',
      error: error.message,
    };
  }
}

// ---------- Participant APIs ----------

export async function getParticipantDashboard() {
  const response = await fetch(`${API_BASE_URL}/api/participant/dashboard`, {
    method: 'GET',
    credentials: 'include',
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to load dashboard');
  }
  return result;
}

export async function getNotifications() {
  const response = await fetch(`${API_BASE_URL}/api/notifications`, {
    method: 'GET',
    credentials: 'include',
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to load notifications');
  }
  return result;
}

export async function markNotificationRead(notificationIds: string[]): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ notificationIds }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to mark notifications as read', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// ---------- Settings ----------

export async function updatePassword(oldPassword: string, newPassword: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/settings/password`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to update password', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function updateEmailPreferences(allowMarketingEmails: boolean): Promise<{ message: string; allowMarketingEmails?: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/settings/email-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ allowMarketingEmails }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to update email preferences', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// ---------- Judge API Functions ----------

export async function getJudgeDashboard(): Promise<{ message: string; dashboard?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/dashboard`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to load judge dashboard', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function getAssignedTeams(page: number = 1, limit: number = 10): Promise<{ message: string; teams?: any[]; pagination?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/assignments?page=${page}&limit=${limit}`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to load assigned teams', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function getJudgeSubmission(teamId: string): Promise<{ message: string; submission?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/submission/${teamId}`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to load submission', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function getMyReviews(): Promise<{ message: string; reviews?: any[]; totalCount?: number; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/my-reviews`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to load reviews', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// Evaluation API Functions
export async function getEvaluationDraft(teamId: string): Promise<{ message: string; evaluation?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/evaluation/${teamId}`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to load evaluation', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function saveEvaluationDraft(teamId: string, data: {
  score_innovation?: number;
  score_feasibility?: number;
  score_execution?: number;
  score_presentation?: number;
  comments?: string;
}): Promise<{ message: string; evaluation?: any; error?: string; errors?: any[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/evaluation/${teamId}/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to save draft', error: result.message, errors: result.errors };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function submitFinalEvaluation(teamId: string, data: {
  score_innovation: number;
  score_feasibility: number;
  score_execution: number;
  score_presentation: number;
  comments: string;
}): Promise<{ message: string; evaluation?: any; error?: string; errors?: any[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/evaluation/${teamId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to submit evaluation', error: result.message, errors: result.errors };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function updateSubmittedEvaluation(teamId: string, data: {
  score_innovation: number;
  score_feasibility: number;
  score_execution: number;
  score_presentation: number;
  comments: string;
}): Promise<{ message: string; evaluation?: any; error?: string; errors?: any[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/evaluation/${teamId}/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to update evaluation', error: result.message, errors: result.errors };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function getEvaluationStatus(teamId: string): Promise<{ message: string; status?: string; isLocked?: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge/evaluation/${teamId}/status`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to get evaluation status', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// ---------- Admin API Functions ----------

export async function adminCreateJudge(data: { email: string; firstName: string; lastName: string }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/judge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create judge');
  return result;
}

export async function adminGetJudges(page: number = 1, limit: number = 10) {
  const response = await fetch(`${API_BASE_URL}/api/admin/judges?page=${page}&limit=${limit}`, {
    method: 'GET',
    credentials: 'include',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to load judges');
  return result;
}

export async function adminUpdateJudge(judgeId: string, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/admin/judge/${judgeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update judge');
  return result;
}

export async function adminDeleteJudge(judgeId: string, type: 'soft' | 'hard' = 'soft') {
  const response = await fetch(`${API_BASE_URL}/api/admin/judge/${judgeId}?type=${type}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to delete judge');
  return result;
}

export async function adminGetTeams(page: number = 1, limit: number = 10, opts?: { status?: string; search?: string }) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (opts?.status) params.set('status', opts.status);
  if (opts?.search) params.set('search', opts.search);
  const response = await fetch(`${API_BASE_URL}/api/admin/teams?${params.toString()}`, { method: 'GET', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to load teams');
  return result;
}

export async function adminGetTeam(teamId: string) {
  const response = await fetch(`${API_BASE_URL}/api/admin/team/${teamId}`, { method: 'GET', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to load team');
  return result;
}

export async function adminUpdateTeam(teamId: string, data: any) {
  const response = await fetch(`${API_BASE_URL}/api/admin/team/${teamId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update team');
  return result;
}

export async function adminVerifyTeam(teamId: string, action: 'approve' | 'reject') {
  const response = await fetch(`${API_BASE_URL}/api/admin/team/${teamId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to verify team');
  return result;
}

export async function adminGetJudgeAssignments() {
  const response = await fetch(`${API_BASE_URL}/api/admin/judge-assignments`, { method: 'GET', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to load judge assignments');
  return result;
}

export async function adminAssignTeams(assignments: { judgeId: string; teamId: string }[]) {
  const response = await fetch(`${API_BASE_URL}/api/admin/assignments/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ assignments }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to assign teams');
  return result;
}

export async function adminReassignTeam(payload: { teamId: string; oldJudgeId: string; newJudgeId: string }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/assignments/reassign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to reassign team');
  return result;
}

export async function adminAutoBalance() {
  const response = await fetch(`${API_BASE_URL}/api/admin/assignments/auto-balance`, { method: 'POST', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to auto-balance');
  return result;
}

export async function adminGetSubmissions(page: number = 1, limit: number = 10, opts?: { status?: string }) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (opts?.status) params.set('status', opts.status);
  const response = await fetch(`${API_BASE_URL}/api/admin/submissions?${params.toString()}`, { method: 'GET', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to load submissions');
  return result;
}

export async function adminGetSubmissionDetail(submissionId: string) {
  const response = await fetch(`${API_BASE_URL}/api/admin/submission/${submissionId}`, { method: 'GET', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to load submission');
  return result;
}

export async function adminChangeSubmissionStatus(submissionId: string, data: { newStatus: string; adminNote?: string }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/submission/${submissionId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to change submission status');
  return result;
}

export async function adminGetSubmissionDownloadUrl(submissionId: string) {
  const response = await fetch(`${API_BASE_URL}/api/admin/submission/${submissionId}/download`, { method: 'GET', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to get download URL');
  return result;
}

export async function adminAggregateScores() {
  const response = await fetch(`${API_BASE_URL}/api/admin/scores/aggregate`, { method: 'POST', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to aggregate scores');
  return result;
}

export async function adminComputeLeaderboard() {
  const response = await fetch(`${API_BASE_URL}/api/admin/scores/compute-leaderboard`, { method: 'POST', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to compute leaderboard');
  return result;
}

export async function adminGetLeaderboard(isPublished?: boolean) {
  const q = typeof isPublished === 'boolean' ? `?isPublished=${String(isPublished)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/admin/leaderboard${q}`, { method: 'GET', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to load leaderboard');
  return result;
}

export async function adminPublishLeaderboardToggle(shouldPublish: boolean) {
  const response = await fetch(`${API_BASE_URL}/api/admin/leaderboard/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ shouldPublish }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to toggle publish');
  return result;
}

export async function adminCreateAnnouncement(data: { title: string; content: string; targetCriteria?: any; scheduledAt?: string }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create announcement');
  return result;
}

export async function adminSendAnnouncementNow(announcementId: string) {
  const response = await fetch(`${API_BASE_URL}/api/admin/announcements/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ announcementId }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to send announcement');
  return result;
}

export async function adminScheduleAnnouncement(announcementId: string, scheduledAt: string) {
  const response = await fetch(`${API_BASE_URL}/api/admin/announcements/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ announcementId, scheduledAt }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to schedule announcement');
  return result;
}

export async function adminGetAnnouncements(page: number = 1, limit: number = 10) {
  const response = await fetch(`${API_BASE_URL}/api/admin/announcements?page=${page}&limit=${limit}`, { method: 'GET', credentials: 'include' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to load announcements');
  return result;
}

export async function getEventInfo() {
  const response = await fetch(`${API_BASE_URL}/api/event/info`, {
    method: 'GET',
    credentials: 'include',
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Failed to load event info');
  }
  return result;
}

export async function getMyTeam() {
  const response = await fetch(`${API_BASE_URL}/api/teams/my-details`, {
    method: 'GET',
    credentials: 'include',
  });
  const result = await response.json();
  if (!response.ok) {
    // API returns 404 when not in a team
    if (response.status === 404) {
      return { team: null, message: result.message };
    }
    return result;
  }
  return result;
}

// ---------- Team Management APIs ----------

export async function createTeam(name: string): Promise<{ message: string; team?: any; joinCode?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to create team', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function joinTeam(joinCode: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ joinCode }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to join team', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function getTeamDetails(teamId?: string): Promise<{ team?: any; message?: string; error?: string }> {
  try {
    const url = teamId 
      ? `${API_BASE_URL}/api/teams/${teamId}`
      : `${API_BASE_URL}/api/teams/my-details`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      // Handle 404 (no team) as a valid state, not an error
      if (response.status === 404) {
        return { team: null, message: result.message || 'No team found' };
      }
      return { message: result.message || 'Failed to get team details', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function addTeamMember(email: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/member/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to invite member', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/member/remove`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ memberId }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to remove member', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// Get current user's team members (GET /api/teams/me/members)
export async function getMyTeamMembers(): Promise<{ members?: any[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/me/members`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { error: result.message || 'Failed to get team members' };
    }
    return result;
  } catch (error: any) {
    return { error: error.message };
  }
}

// Get pending invitations for my team (GET /api/teams/me/pending-invites)
export async function getPendingInvitations(): Promise<{ invitations?: any[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/me/pending-invites`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { error: result.message || 'Failed to get pending invitations' };
    }
    return result;
  } catch (error: any) {
    return { error: error.message };
  }
}

// Remove member by member ID (DELETE /api/teams/member/:memberId)
export async function removeMemberById(memberId: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/member/${memberId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to remove member', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// Send team invite (POST /api/teams/invite)
export async function sendTeamInvite(email: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to send invite', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function updateTeamDetails(updates: { name?: string }): Promise<{ message: string; team?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/update`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to update team', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// Check invite status and if user exists (GET /api/teams/invite/check/:token)
export async function checkInviteStatus(token: string): Promise<{ valid?: boolean; email?: string; userExists?: boolean; userId?: string | null; message?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/invite/check/${token}`, {
      method: 'GET',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to check invite status', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function acceptInvite(token: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/accept-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to accept invite', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function getTeamMembers(teamId: string): Promise<{ members?: any[]; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { error: result.message || 'Failed to get team members' };
    }
    return result;
  } catch (error: any) {
    return { error: error.message };
  }
}

// ---------- Password Reset ----------

export async function forgotPassword(email: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Request failed', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// ---------- Submission Management ----------

// Get submission details by ID
export async function getSubmissionDetails(submissionId: string): Promise<{ submission?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
      method: 'GET',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { error: result.message || 'Failed to fetch submission details' };
    }
    return result;
  } catch (error: any) {
    return { error: error.message };
  }
}

// Save draft submission (POST /api/submissions) - multipart/form-data
export async function saveSubmissionDraft(data: {
  title: string;
  description?: string;
  repoUrl?: string;
  zipFile?: File;
}): Promise<{ message: string; submission?: any; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.repoUrl) formData.append('repoUrl', data.repoUrl);
    if (data.zipFile) formData.append('zipFile', data.zipFile);

    const response = await fetch(`${API_BASE_URL}/api/submissions`, {
      method: 'POST',
      credentials: 'include',
      body: formData, // Don't set Content-Type header, browser will set it with boundary
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to save draft', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// Update submission details (PATCH /api/submissions/:id)
export async function updateSubmission(submissionId: string, updates: {
  title?: string;
  description?: string;
  repoUrl?: string;
}): Promise<{ message: string; submission?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to update submission', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

// Finalize submission (PUT /api/submissions/:id/finalize)
export async function finalizeSubmission(submissionId: string): Promise<{ message: string; submission?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}/finalize`, {
      method: 'PUT',
      credentials: 'include',
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Failed to finalize submission', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token, newPassword }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { message: result.message || 'Reset failed', error: result.message };
    }
    return result;
  } catch (error: any) {
    return { message: 'Network error. Please try again.', error: error.message };
  }
}



