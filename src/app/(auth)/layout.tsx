import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

/**
 * AuthLayout (Public Gatekeeper)
 * 
 * dynamic = 'force-dynamic' é essencial aqui para verificar sessão real no build.
 */
export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F0F8FF] p-4 sm:p-8">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
        {children}
      </div>
    </main>
  );
}
