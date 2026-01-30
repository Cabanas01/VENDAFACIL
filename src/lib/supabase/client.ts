'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Prevenção de erro inesperado: Se as variáveis não estiverem prontas, 
// o cliente não quebra a renderização inicial, permitindo que o React carregue.
export const supabase = createBrowserClient<Database>(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);
