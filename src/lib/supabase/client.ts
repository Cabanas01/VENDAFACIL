'use client';

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Se faltar env na Vercel, não derruba a aplicação inteira
  if (!supabaseUrl || !supabaseAnonKey) return null;

  supabase = createClient(supabaseUrl, supabaseAnonKey);
  return supabase;
}
