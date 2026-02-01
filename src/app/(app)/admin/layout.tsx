import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

/**
 * AdminLayout (Server-Side Authorization Gate)
 * 
 * dynamic = 'force-dynamic' impede erros de pré-renderização no build.
 */
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();

  // 1. Verifica se existe um usuário autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Valida o status de admin via RPC
  const { data: isAdmin, error: rpcError } = await supabase.rpc('get_admin_status');

  if (rpcError || !isAdmin) {
    console.error('[ADMIN_AUTH_DENIED]', { userId: user.id, rpcError });
    redirect('/dashboard');
  }

  return (
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  );
}
