import { createClient } from '@supabase/supabase-js';

// This client is for server-side use only, using the service role key.
// It should never be exposed to the client.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables for admin client');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);
