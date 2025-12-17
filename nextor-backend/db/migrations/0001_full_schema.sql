-- Full public schema exported from Supabase

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'participant',
    'judge',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Insert User
    INSERT INTO "Users" (
        email, 
        password, 
        role, 
        is_verified
    )
    VALUES (
        p_email, 
        p_hashed_password, 
        'judge', 
        true
    )
    RETURNING id INTO v_user_id;

    -- 2. Insert Profile (Explicitly generating the ID now)
    INSERT INTO "Profiles" (id, user_id, first_name, last_name)
    VALUES (gen_random_uuid(), v_user_id, p_first_name, p_last_name);

    -- 3. Return Combined Data
    SELECT jsonb_build_object(
        'id', v_user_id,
        'email', p_email,
        'role', 'judge',
        'first_name', p_first_name,
        'last_name', p_last_name
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;


ALTER FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text", "p_invite_token" "text", "p_token_expiry" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Insert User with Invite Token
    INSERT INTO "Users" (
        email, 
        password, 
        role, 
        is_verified, 
        reset_password_token, 
        reset_password_expires
    )
    VALUES (
        p_email, 
        p_hashed_password, 
        'judge', 
        true, 
        p_invite_token, 
        p_token_expiry
    )
    RETURNING id INTO v_user_id;

    -- 2. Insert Profile (If this fails, the User insert ROLLS BACK)
    INSERT INTO "Profiles" (user_id, first_name, last_name)
    VALUES (v_user_id, p_first_name, p_last_name);

    -- 3. Return Combined Data
    SELECT jsonb_build_object(
        'id', v_user_id,
        'email', p_email,
        'role', 'judge',
        'first_name', p_first_name,
        'last_name', p_last_name
    ) INTO v_result;

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- Propagate error to application (triggering rollback)
    RAISE;
END;
$$;


ALTER FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text", "p_invite_token" "text", "p_token_expiry" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_platform_settings_transaction"("p_admin_id" "uuid", "p_updates" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_old_settings JSONB;
    v_new_settings JSONB;
BEGIN
    -- A. Capture the current state (for audit "before" state)
    SELECT to_jsonb(s) INTO v_old_settings FROM "Settings" s WHERE id = '00000000-0000-0000-0000-000000000001';

    -- B. Perform the Update (handling partial updates via COALESCE)
    -- We cast the JSON fields to the correct types.
    UPDATE "Settings"
    SET 
        submission_deadline = COALESCE((p_updates->>'submission_deadline')::timestamptz, submission_deadline),
        is_registration_open = COALESCE((p_updates->>'is_registration_open')::boolean, is_registration_open),
        max_team_size = COALESCE((p_updates->>'max_team_size')::integer, max_team_size),
        event_name = COALESCE((p_updates->>'event_name')::text, event_name),
        updated_at = NOW()
    WHERE id = '00000000-0000-0000-0000-000000000001'
    RETURNING to_jsonb("Settings".*) INTO v_new_settings;

    -- C. Insert Audit Log (This will ROLLBACK if the Update failed, or vice versa)
    INSERT INTO "AuditLogs" (admin_id, action, details)
    VALUES (
        p_admin_id, 
        'UPDATE_SETTINGS', 
        jsonb_build_object(
            'changes', p_updates,
            'previous_state', v_old_settings,
            'new_state', v_new_settings
        )
    );

    -- D. Return the new settings
    RETURN v_new_settings;
    
EXCEPTION WHEN OTHERS THEN
    -- If anything fails, the transaction automatically rolls back.
    RAISE;
END;
$$;


ALTER FUNCTION "public"."update_platform_settings_transaction"("p_admin_id" "uuid", "p_updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."AggregatedScores" (
    "team_id" "uuid" NOT NULL,
    "average_score" numeric(5,2) NOT NULL,
    "review_count" integer DEFAULT 0 NOT NULL,
    "aggregated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."AggregatedScores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" "text" NOT NULL,
    "target_criteria" "jsonb" DEFAULT '{}'::"jsonb",
    "status" character varying(50) DEFAULT 'draft'::character varying,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."Announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AuditLogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid",
    "action" character varying(255) NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."AuditLogs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "assignment_id" "uuid" NOT NULL,
    "judge_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "score_innovation" numeric,
    "score_feasibility" numeric,
    "score_execution" numeric,
    "score_presentation" numeric,
    "comments" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "submitted_at" timestamp with time zone,
    "is_locked_by_admin" boolean DEFAULT false
);


ALTER TABLE "public"."Evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."JudgeAssignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "judge_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL
);


ALTER TABLE "public"."JudgeAssignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Leaderboard" (
    "team_id" "uuid" NOT NULL,
    "final_score" numeric(5,2) NOT NULL,
    "rank" integer NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "computed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."Leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "target_role" "text" DEFAULT 'participant'::"text",
    "category" "text"
);


ALTER TABLE "public"."Notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "phone" "text",
    "linkedin_url" "text",
    "github_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "team_id" "uuid"
);


ALTER TABLE "public"."Profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_deadline" timestamp with time zone,
    "is_registration_open" boolean DEFAULT true,
    "max_team_size" integer DEFAULT 4,
    "event_name" character varying(255) DEFAULT 'Hackathon 2025'::character varying,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."Settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "repo_url" "text",
    "zip_storage_path" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "submitted_at" timestamp with time zone,
    "admin_status_note" "text"
);


ALTER TABLE "public"."Submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TeamInvitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."TeamInvitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."TeamMembers" (
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."TeamMembers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "join_code" "text" NOT NULL,
    "leader_id" "uuid",
    "is_finalized" boolean DEFAULT false,
    "verification_status" "text" DEFAULT 'pending'::"text",
    "city" character varying(255),
    "admin_notes" "text",
    "project_category" character varying(255) DEFAULT 'General'::character varying,
    "college" character varying(255)
);


ALTER TABLE "public"."Teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."UserNotifications" (
    "user_id" "uuid" NOT NULL,
    "notification_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone
);


ALTER TABLE "public"."UserNotifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text" NOT NULL,
    "password" "text" NOT NULL,
    "role" "public"."app_role" DEFAULT 'participant'::"public"."app_role",
    "is_verified" boolean DEFAULT false,
    "allow_marketing" boolean DEFAULT true,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."Users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."AggregatedScores"
    ADD CONSTRAINT "AggregatedScores_pkey" PRIMARY KEY ("team_id");



ALTER TABLE ONLY "public"."Announcements"
    ADD CONSTRAINT "Announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AuditLogs"
    ADD CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Evaluations"
    ADD CONSTRAINT "Evaluations_assignment_id_key" UNIQUE ("assignment_id");



ALTER TABLE ONLY "public"."Evaluations"
    ADD CONSTRAINT "Evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."JudgeAssignments"
    ADD CONSTRAINT "JudgeAssignments_judge_id_team_id_key" UNIQUE ("judge_id", "team_id");



ALTER TABLE ONLY "public"."JudgeAssignments"
    ADD CONSTRAINT "JudgeAssignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Leaderboard"
    ADD CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("team_id");



ALTER TABLE ONLY "public"."Notifications"
    ADD CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Profiles"
    ADD CONSTRAINT "Profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Settings"
    ADD CONSTRAINT "Settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Submissions"
    ADD CONSTRAINT "Submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TeamInvitations"
    ADD CONSTRAINT "TeamInvitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."TeamInvitations"
    ADD CONSTRAINT "TeamInvitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."TeamMembers"
    ADD CONSTRAINT "TeamMembers_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."Teams"
    ADD CONSTRAINT "Teams_join_code_key" UNIQUE ("join_code");



ALTER TABLE ONLY "public"."Teams"
    ADD CONSTRAINT "Teams_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."Teams"
    ADD CONSTRAINT "Teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."UserNotifications"
    ADD CONSTRAINT "UserNotifications_pkey" PRIMARY KEY ("user_id", "notification_id");



ALTER TABLE ONLY "public"."Users"
    ADD CONSTRAINT "Users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."Users"
    ADD CONSTRAINT "Users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Evaluations"
    ADD CONSTRAINT "unique_judge_team" UNIQUE ("judge_id", "team_id");



ALTER TABLE ONLY "public"."Profiles"
    ADD CONSTRAINT "unique_user_profile" UNIQUE ("user_id");



CREATE UNIQUE INDEX "unique_team_submission" ON "public"."Submissions" USING "btree" ("team_id") WHERE ("status" = 'submitted'::"text");



CREATE OR REPLACE TRIGGER "update_evaluations_updated_at" BEFORE UPDATE ON "public"."Evaluations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


ALTER TABLE ONLY "public"."AggregatedScores"
    ADD CONSTRAINT "AggregatedScores_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."Teams"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Announcements"
    ADD CONSTRAINT "Announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."Users"("id");


ALTER TABLE ONLY "public"."AuditLogs"
    ADD CONSTRAINT "AuditLogs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."Users"("id");


ALTER TABLE ONLY "public"."Evaluations"
    ADD CONSTRAINT "Evaluations_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."JudgeAssignments"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Evaluations"
    ADD CONSTRAINT "Evaluations_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."Users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Evaluations"
    ADD CONSTRAINT "Evaluations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."Submissions"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Evaluations"
    ADD CONSTRAINT "Evaluations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."Teams"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."JudgeAssignments"
    ADD CONSTRAINT "JudgeAssignments_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "public"."Users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."JudgeAssignments"
    ADD CONSTRAINT "JudgeAssignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."Teams"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Leaderboard"
    ADD CONSTRAINT "Leaderboard_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."Teams"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Profiles"
    ADD CONSTRAINT "Profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Submissions"
    ADD CONSTRAINT "Submissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."Teams"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."TeamInvitations"
    ADD CONSTRAINT "TeamInvitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."Teams"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."TeamMembers"
    ADD CONSTRAINT "TeamMembers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."Teams"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."TeamMembers"
    ADD CONSTRAINT "TeamMembers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Teams"
    ADD CONSTRAINT "Teams_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "public"."Users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."UserNotifications"
    ADD CONSTRAINT "UserNotifications_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."Notifications"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."UserNotifications"
    ADD CONSTRAINT "UserNotifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."Users"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."Profiles"
    ADD CONSTRAINT "fk_profiles_team_id" FOREIGN KEY ("team_id") REFERENCES "public"."Teams"("id") ON DELETE SET NULL;


CREATE POLICY "Allow team members to read team profiles" ON "public"."Profiles" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "TeamMembers"."user_id"
   FROM "public"."TeamMembers"
  WHERE ("TeamMembers"."team_id" IN ( SELECT "TeamMembers_1"."team_id"
           FROM "public"."TeamMembers" "TeamMembers_1"
          WHERE ("TeamMembers_1"."user_id" = "auth"."uid"()))))));


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


GRANT ALL ON FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text") TO "service_role";


GRANT ALL ON FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text", "p_invite_token" "text", "p_token_expiry" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text", "p_invite_token" "text", "p_token_expiry" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_judge_account_transaction"("p_email" "text", "p_hashed_password" "text", "p_first_name" "text", "p_last_name" "text", "p_invite_token" "text", "p_token_expiry" timestamp with time zone) TO "service_role";


GRANT ALL ON FUNCTION "public"."update_platform_settings_transaction"("p_admin_id" "uuid", "p_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_platform_settings_transaction"("p_admin_id" "uuid", "p_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_platform_settings_transaction"("p_admin_id" "uuid", "p_updates" "jsonb") TO "service_role";


GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


GRANT ALL ON TABLE "public"."AggregatedScores" TO "anon";
GRANT ALL ON TABLE "public"."AggregatedScores" TO "authenticated";
GRANT ALL ON TABLE "public"."AggregatedScores" TO "service_role";


GRANT ALL ON TABLE "public"."Announcements" TO "anon";
GRANT ALL ON TABLE "public"."Announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."Announcements" TO "service_role";


GRANT ALL ON TABLE "public"."AuditLogs" TO "anon";
GRANT ALL ON TABLE "public"."AuditLogs" TO "authenticated";
GRANT ALL ON TABLE "public"."AuditLogs" TO "service_role";


GRANT ALL ON TABLE "public"."Evaluations" TO "anon";
GRANT ALL ON TABLE "public"."Evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."Evaluations" TO "service_role";


GRANT ALL ON TABLE "public"."JudgeAssignments" TO "anon";
GRANT ALL ON TABLE "public"."JudgeAssignments" TO "authenticated";
GRANT ALL ON TABLE "public"."JudgeAssignments" TO "service_role";


GRANT ALL ON TABLE "public"."Leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."Leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."Leaderboard" TO "service_role";


GRANT ALL ON TABLE "public"."Notifications" TO "anon";
GRANT ALL ON TABLE "public"."Notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."Notifications" TO "service_role";


GRANT ALL ON TABLE "public"."Profiles" TO "anon";
GRANT ALL ON TABLE "public"."Profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."Profiles" TO "service_role";


GRANT ALL ON TABLE "public"."Settings" TO "anon";
GRANT ALL ON TABLE "public"."Settings" TO "authenticated";
GRANT ALL ON TABLE "public"."Settings" TO "service_role";


GRANT ALL ON TABLE "public"."Submissions" TO "anon";
GRANT ALL ON TABLE "public"."Submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."Submissions" TO "service_role";


GRANT ALL ON TABLE "public"."TeamInvitations" TO "anon";
GRANT ALL ON TABLE "public"."TeamInvitations" TO "authenticated";
GRANT ALL ON TABLE "public"."TeamInvitations" TO "service_role";


GRANT ALL ON TABLE "public"."TeamMembers" TO "anon";
GRANT ALL ON TABLE "public"."TeamMembers" TO "authenticated";
GRANT ALL ON TABLE "public"."TeamMembers" TO "service_role";


GRANT ALL ON TABLE "public"."Teams" TO "anon";
GRANT ALL ON TABLE "public"."Teams" TO "authenticated";
GRANT ALL ON TABLE "public"."Teams" TO "service_role";


GRANT ALL ON TABLE "public"."UserNotifications" TO "anon";
GRANT ALL ON TABLE "public"."UserNotifications" TO "authenticated";
GRANT ALL ON TABLE "public"."UserNotifications" TO "service_role";


GRANT ALL ON TABLE "public"."Users" TO "anon";
GRANT ALL ON TABLE "public"."Users" TO "authenticated";
GRANT ALL ON TABLE "public"."Users" TO "service_role";


ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";




ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";




ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
