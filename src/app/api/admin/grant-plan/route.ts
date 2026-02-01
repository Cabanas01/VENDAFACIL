import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const body = await req.json().catch(() => null);
    console.log('[grant-plan] payload received:', body);

    const { storeId, planoTipo, duracaoDias, origem, renovavel } = body || {};

    if (!storeId || !planoTipo || !Number.isInteger(duracaoDias) || duracaoDias <= 0 || !origem || typeof renovavel !== 'boolean') {
      return NextResponse.json(
        { ok: false, error: 'invalid_payload', message: 'Payload inválido ou incompleto.', details: body },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated', message: 'Sessão não encontrada ou inválida.' }, { status: 401 });
    }
    console.log('[grant-plan] Authenticated User ID:', user.id);

    const { error: rpcErr } = await supabase.rpc('admin_grant_store_access', {
      p_store_id: storeId,
      p_plano_tipo: planoTipo,
      p_duracao_dias: duracaoDias,
      p_origem: origem,
      p_renovavel: renovavel
    });

    if (rpcErr) {
      console.error('[grant-plan] RPC failed:', {
        message: rpcErr.message,
        details: rpcErr.details,
        hint: rpcErr.hint,
        code: rpcErr.code,
      });

      const msg = (rpcErr.message || '').toLowerCase();
      if (msg.includes('not admin')) {
        return NextResponse.json({ ok: false, error: 'not_admin', message: 'Acesso negado: o usuário não é administrador.' }, { status: 403 });
      }

      return NextResponse.json(
        { ok: false, error: 'rpc_failed', message: rpcErr.message, details: rpcErr.details, hint: rpcErr.hint, code: rpcErr.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Plano concedido com sucesso.' }, { status: 200 });
  } catch (e: any) {
    console.error('[grant-plan] unexpected server error:', e);
    return NextResponse.json({ ok: false, error: 'server_error', message: e?.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}
