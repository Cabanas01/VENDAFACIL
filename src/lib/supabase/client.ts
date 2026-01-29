'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}

// NOTE: This file was updated to use the new cookie-based browser client from @supabase/ssr.
// This is the core fix to make the session available on the server.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
