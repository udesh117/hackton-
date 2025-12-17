-- 0001_tables.sql
-- Creates schema, enum types, and all tables

-- NOTE: Run this first

CREATE SCHEMA IF NOT EXISTS "public";

ALTER SCHEMA "public" OWNER TO "pg_database_owner";

COMMENT ON SCHEMA "public" IS 'standard public schema';


CREATE TYPE "public"."app_role" AS ENUM (
    'participant',
    'judge',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


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
