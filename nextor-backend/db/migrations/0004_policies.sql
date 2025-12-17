-- 0004_policies.sql
-- Row-level security policies

-- NOTE: Run after 0001, 0002, 0003

CREATE POLICY "Allow team members to read team profiles" ON "public"."Profiles" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "TeamMembers"."user_id"
   FROM "public"."TeamMembers"
  WHERE ("TeamMembers"."team_id" IN ( SELECT "TeamMembers_1"."team_id"
           FROM "public"."TeamMembers" "TeamMembers_1"
          WHERE ("TeamMembers_1"."user_id" = "auth"."uid"()))))));
