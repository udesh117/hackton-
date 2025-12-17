-- 0002_constraints.sql
-- Adds primary keys, unique constraints, indexes and foreign keys

-- NOTE: Run after 0001_tables.sql

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


-- Foreign keys
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
