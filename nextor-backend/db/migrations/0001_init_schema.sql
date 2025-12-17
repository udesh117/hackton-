-- Full schema dump exported from Supabase (public schema)

SET statement_timeout = 0;
-- (file replaced with the canonical exported schema)

-- For the full contents, see db/schema_dbnizodalceavjongmij.sql




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
 GRANT ALL ON TABLE "public"."Notifications" TO "anon";