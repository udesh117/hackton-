````markdown
Migration files in this folder (run in order):

- `0001_tables.sql` — create schema, enum types and all tables
- `0002_constraints.sql` — primary keys, unique constraints, indexes and foreign keys
- `0003_functions.sql` — stored functions and triggers
- `0004_policies.sql` — row-level security policies
- `0005_grants.sql` — grants and default privileges

How to run the migrations (example):

Prerequisites:
- `psql` installed and reachable from your shell.
- A Postgres role with privileges to create extensions, types, functions, and set owners/grants (superuser recommended for initial setup).
- If your target DB is not Supabase, review and adjust GRANTs that reference roles `anon`, `authenticated`, and `service_role`.

Minimum `.env` required to run the migration locally (example):

DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>

Quick PowerShell steps (copy & paste):

```powershell
# 1) Create `pgcrypto` extension (needed for gen_random_uuid())
psql "$env:DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# 2) Run ordered migrations
psql "$env:DATABASE_URL" -f db/migrations/0001_tables.sql
psql "$env:DATABASE_URL" -f db/migrations/0002_constraints.sql
psql "$env:DATABASE_URL" -f db/migrations/0003_functions.sql
psql "$env:DATABASE_URL" -f db/migrations/0004_policies.sql
psql "$env:DATABASE_URL" -f db/migrations/0005_grants.sql
```

Notes & troubleshooting:
- The files are split so DB objects are created in a safe order: tables → constraints → functions/triggers → policies → grants.
- Triggers that reference functions are created in `0003_functions.sql` (functions must exist first).
- If you run these on a non-Supabase Postgres, remove or edit `GRANT` lines referencing `anon`/`authenticated`/`service_role` if those roles are not present.
- If the `CREATE EXTENSION` step fails, ensure the connecting role has superuser privileges.
- These migrations create schema and objects but do not add seed data.


--------------------------------------------------------------

# 0001_full_schema.sql — full public schema export from Supabase.

Notes:
- This migration file sets up schema, types, functions, triggers, constraints, and grants for the public schema.
- If you manage migrations with a tool (Flyway, Prisma Migrate, etc.), use the small split migration files such as tables → constraints → functions → policies → grants .

Run instructions and required .env
-------------------------------

Prerequisites:
- `psql` (Postgres client) installed and available in PATH.
- A Postgres user with sufficient privileges (the script creates types/functions and sets owners/grants).
- (Optional) If using Supabase roles/policies, the target DB should have roles `anon`, `authenticated`, and `service_role` or you should remove/adjust GRANT lines.

Minimum `.env` required to run the migration and the app (example):

DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
# If you use Supabase SDK in the app, also set these (replace with your project values):
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
SUPABASE_ANON_KEY=eyJ...your_anon_key...
NODE_ENV=development
PORT=4000
JWT_SECRET=replace_with_secure_secret

Notes on env usage:
- For running the SQL migration you only need `DATABASE_URL` set and a superuser to create extensions/types/owners.
- The Supabase keys (`SUPABASE_*`) are only required if you intend to run the app against a Supabase project or use Supabase features.

Recommended migration steps (PowerShell):

```powershell
# 1) Create pgcrypto extension (required for gen_random_uuid()). Replace connection string as needed.
psql "$env:DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# 2) Run the migration file
psql "$env:DATABASE_URL" -f db/migrations/0001_full_schema.sql
```

Troubleshooting / notes:
- If the `CREATE EXTENSION` command fails, ensure the connecting role has superuser privileges.
- If you are not using Supabase, consider removing or editing GRANT statements for roles that don't exist in your environment.
- The migration creates schema, constraints, triggers, functions and grants but does not insert seed data — testers can call the endpoints to populate initial records.
