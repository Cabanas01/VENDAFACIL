import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

/**
 * @fileOverview AuthLayout (SERVER-SIDE PUBLIC GATEKEEPER)
 * 
 * Este layout impede que usuários LOGADOS acessem a página de login.
 * Se houver sessão, redireciona síncronamente para o portal privado.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();

  // Se já houver sessão, pula o login e manda para o portal privado (AppLayout cuidará do resto)
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
