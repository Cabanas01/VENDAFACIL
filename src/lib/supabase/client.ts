'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';

// This is the client-side Supabase client.
// It is used in client components and hooks.
// It is essential that this uses `createBrowserClient` from `@supabase/ssr`
// to ensure it manages the session via cookies, making it available to the server.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);