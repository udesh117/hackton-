-- 0003_functions.sql
-- Creates stored functions and triggers (run after tables and constraints)

-- NOTE: Run after 0001 and 0002

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


-- Triggers that depend on functions: create after the functions exist
CREATE OR REPLACE TRIGGER "update_evaluations_updated_at" BEFORE UPDATE ON "public"."Evaluations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
