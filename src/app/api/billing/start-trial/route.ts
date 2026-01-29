import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addDays } from 'date-fns';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    // Buscar a loja do usuário
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, trial_used')
      .eq('user_id', user.id)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json({ error: 'Loja não encontrada para este usuário.' }, { status: 404 });
    }

    if (store.trial_used) {
      return NextResponse.json({ error: 'O período de avaliação já foi utilizado por esta loja.' }, { status: 400 });
    }

    const now = new Date();
    const expirationDate = addDays(now, 7);

    // 1. Atualizar o status da loja para marcar que o trial foi usado
    const { error: updateStoreError } = await supabaseAdmin
      .from('stores')
      .update({ 
        trial_used: true, 
        trial_started_at: now.toISOString() 
      })
      .eq('id', store.id);

    if (updateStoreError) {
      throw new Error(`Erro ao atualizar status da loja: ${updateStoreError.message}`);
    }

    // 2. Conceder o acesso na tabela store_access com os parâmetros exatos solicitados
    const { error: accessError } = await supabaseAdmin
      .from('store_access')
      .upsert({
        store_id: store.id,
        plano_nome: 'Avaliação',
        plano_tipo: 'free',
        data_inicio_acesso: now.toISOString(),
        data_fim_acesso: expirationDate.toISOString(),
        status_acesso: 'ativo',
        origem: 'trial',
        renovavel: false,
      }, { onConflict: 'store_id' });

    if (accessError) {
      throw new Error(`Erro ao conceder acesso: ${accessError.message}`);
    }

    return NextResponse.json({ success: true, message: 'Período de avaliação ativado com sucesso!' });
  } catch (e: any) {
    console.error('[START_TRIAL] Unexpected error:', e);
    return NextResponse.json({ error: e.message || 'Erro interno ao iniciar avaliação.' }, { status: 500 });
  }
}
