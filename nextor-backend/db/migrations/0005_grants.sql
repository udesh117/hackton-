-- 0005_grants.sql
-- Grants and default privileges (run last)

-- NOTE: Run after 0001..0004

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
