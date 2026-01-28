'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://htlrtgzhzvvsxqyzkevi.supabase.co";
const supabaseAnonKey = "sb_publishable_T8KSbI65LTeEkXi8GvM2wg_JQijyvBn";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'vendafacil-auth',
  },
});
