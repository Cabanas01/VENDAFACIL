import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * @fileOverview API para ativação do período de teste (Trial).
 * Chamada via RPC start_trial(p_store_id).
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[API_TRIAL_AUTH_ERROR]', authError);
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    // 1. Localizar a loja do usuário (Owner)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, trial_used')
      .eq('user_id', user.id)
      .maybeSingle();

    if (storeError || !store) {
      console.error('[API_TRIAL_STORE_ERROR]', storeError);
      return NextResponse.json({ error: 'Apenas proprietários podem iniciar o período de teste.' }, { status: 403 });
    }

    if (store.trial_used) {
      return NextResponse.json({ error: 'O período de avaliação já foi utilizado por esta loja.' }, { status: 400 });
    }

    // 2. Chamar a RPC do banco de dados para processar a lógica de trial
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('start_trial', {
      p_store_id: store.id
    });

    if (rpcError) {
      console.error('[TRIAL_RPC_ERROR]', rpcError);
      return NextResponse.json({ error: `Falha ao processar trial: ${rpcError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Período de avaliação ativado com sucesso!',
      data: rpcData 
    });

  } catch (e: any) {
    console.error('[START_TRIAL_EXCEPTION]', e);
    return NextResponse.json({ error: e.message || 'Erro interno ao iniciar avaliação.' }, { status: 500 });
  }
}
