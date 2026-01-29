import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();

    const body = await req.json().catch(() => null);
    console.log('[grant-plan] payload received:', body);

    const storeId = body?.storeId;
    const plan = body?.plan;
    const durationMonths = Number(body?.durationMonths);

    if (!storeId || !plan || !Number.isFinite(durationMonths) || durationMonths <= 0) {
      return NextResponse.json(
        { ok: false, error: 'invalid_payload', details: { storeId, plan, durationMonths } },
        { status: 400 }
      );
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      console.error('[grant-plan] getUser error:', userErr);
    }
    console.log('[grant-plan] User ID from server:', userData?.user?.id);
    if (!userData?.user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    }
    
    const { error: rpcErr } = await supabase.rpc('admin_grant_store_access', {
      p_store_id: storeId,
      p_plan: plan, // Nome do parâmetro corrigido para 'p_plan'
      p_duration_months: durationMonths,
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
        return NextResponse.json({ ok: false, error: 'not_admin' }, { status: 403 });
      }

      return NextResponse.json(
        { ok: false, error: 'rpc_failed', message: rpcErr.message, details: rpcErr.details, hint: rpcErr.hint, code: rpcErr.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error('[grant-plan] unexpected error:', e);
    return NextResponse.json({ ok: false, error: 'server_error', message: e?.message }, { status: 500 });
  }
}
