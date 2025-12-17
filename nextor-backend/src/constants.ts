// Define the user roles as a union type for strict typing
export type Role = 'participant' | 'judge' | 'admin';

// Optional: Define a list of roles for easy reference
export const ROLES_LIST: Role[] = ['participant', 'judge', 'admin'];

// Optional: Define the default role for public signups
export const DEFAULT_SIGNUP_ROLE: Role = 'participant';

export type TeamRole = 'leader' | 'member';

export const MAX_TEAM_SIZE = 4;