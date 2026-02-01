import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware de Autenticação e Contexto de Rota.
 * 1. Mantém a sessão ativa.
 * 2. Injeta o pathname nos headers para que Server Components saibam a rota atual.
 */
export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Injeta o pathname atual nos headers para os Server Layouts (App Router)
  // Isso permite que Server Components saibam a rota atual de forma síncrona.
  response.headers.set('x-pathname', url.pathname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
          response.headers.set('x-pathname', url.pathname);
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
          response.headers.set('x-pathname', url.pathname);
        },
      },
    }
  );

  // Garante que o auth.uid() esteja disponível no servidor para as RPCs
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/webhooks (webhook routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks/.*).*)',
  ],
};
