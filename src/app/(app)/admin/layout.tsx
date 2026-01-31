import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ReactNode } from 'react';

/**
 * @fileOverview AdminLayout (Server-Side Authorization Gate)
 * 
 * Este layout protege todas as rotas em /admin.
 * A validação ocorre no servidor, garantindo que auth.uid() seja 
 * resolvido corretamente através dos cookies de sessão.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();

  // 1. Verifica se existe um usuário autenticado (Sessão HTTP)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Valida o status de admin via RPC (RLS seguro no servidor)
  // Utilizamos get_admin_status conforme definido no banco de dados.
  const { data: isAdmin, error: rpcError } = await supabase.rpc('get_admin_status');

  if (rpcError || !isAdmin) {
    console.error('[ADMIN_AUTH_DENIED]', { userId: user.id, rpcError });
    // Redireciona para o dashboard caso o usuário não tenha privilégios
    redirect('/dashboard');
  }

  // 3. Se for admin, renderiza o painel
  return (
    <div className="animate-in fade-in duration-500">
      {children}
    </div>
  );
}
