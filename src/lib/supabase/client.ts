'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Singleton Pattern para o Supabase Browser Client.
 * Garante que a instância seja única durante todo o ciclo de vida do cliente,
 * prevenindo falhas de sincronização de cookies e headers de autorização (JWT).
 */
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
  if (clientInstance) return clientInstance;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('As variáveis de ambiente do Supabase não foram configuradas corretamente.');
  }

  clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return clientInstance;
}

// Exportando a instância singleton padrão
export const supabase = getSupabaseBrowserClient();
