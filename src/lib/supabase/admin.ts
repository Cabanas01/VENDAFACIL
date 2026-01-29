import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Ensure environment variables are loaded for server-side contexts
config();

// This client is for server-side use only, using the service role key.
// It should never be exposed to the client.

// We use a singleton pattern to ensure we only create one instance of the client.
let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables for admin client. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  return supabaseAdmin;
}
