import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// Retrieve keys from the environment file
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_KEY environment variables in .env file"
  );
}

// Default client for server-side operations
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);