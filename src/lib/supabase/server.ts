import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Cria um cliente do Supabase para uso exclusivo no servidor (Next.js 15 Async Pattern).
 * Utiliza await cookies() para garantir compatibilidade total com o App Router e Server Actions.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Este erro ocorre em Server Components onde cookies não podem ser setados.
            // Ignoramos pois o middleware lida com o refresh da sessão.
          }
        },
      },
    }
  );
}
