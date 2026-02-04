import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * @fileOverview API segura para exclusão de conta via Supabase Admin (Service Role).
 * 
 * Este endpoint garante que o usuário seja removido tanto do auth.users 
 * quanto das tabelas públicas via cascade ou triggers, de forma administrativa.
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Validar autenticação do usuário na sessão atual
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada. Acesso negado.' }, { status: 401 });
    }

    console.log(`[API_ACCOUNT_DELETE] Iniciando remoção administrativa para: ${user.id}`);

    // 2. Executar a exclusão via Admin Client (Ignora RLS e deleta do auth.users)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[API_ACCOUNT_DELETE_ERROR]', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Conta removida com sucesso.' });

  } catch (err: any) {
    console.error('[API_ACCOUNT_DELETE_EXCEPTION]', err);
    return NextResponse.json({ error: err.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}
