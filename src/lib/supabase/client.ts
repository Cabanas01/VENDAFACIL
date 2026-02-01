'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Singleton Pattern para o Supabase Browser Client.
 * Garante que a instância seja única e resiliente a falhas de configuração iniciais.
 */
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
  if (clientInstance) return clientInstance;

  // Registro de erro silencioso para evitar crash imediato do bundle JS
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE_CONFIG_MISSING] Variáveis de ambiente não detectadas no cliente.');
  }

  clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return clientInstance;
}

export const supabase = getSupabaseBrowserClient();
