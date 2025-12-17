-- 0001_create_roles_users_teams.sql
-- Migration: create app_role enum, Users, Teams, TeamMembers
-- Generated: 2025-12-08

BEGIN;

-- Ensure the pgcrypto extension (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum type for roles if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('participant', 'judge', 'admin');
  END IF;
END
$$;

-- Users table (core authentication table)
CREATE TABLE IF NOT EXISTS "Users" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role app_role DEFAULT 'participant',
  is_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT
);

-- Teams table (for managing hackathon teams)
CREATE TABLE IF NOT EXISTS "Teams" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT UNIQUE NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  leader_id UUID REFERENCES "Users"(id) ON DELETE CASCADE,
  is_finalized BOOLEAN DEFAULT FALSE
);

-- TeamMembers junction table
CREATE TABLE IF NOT EXISTS "TeamMembers" (
  team_id UUID REFERENCES "Teams"(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "Users"(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

COMMIT;
