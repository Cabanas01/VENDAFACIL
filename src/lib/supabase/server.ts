
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Cria um cliente do Supabase para uso exclusivo no lado do servidor (Server Actions / Route Handlers).
 * Utiliza o gerenciamento de cookies do Next.js para propagar a sessão do usuário.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Este erro ocorre se o cookie for definido em um Server Component.
            // Middleware ou Actions lidam com isso automaticamente.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Este erro ocorre se o cookie for removido em um Server Component.
          }
        },
      },
    }
  );
}
