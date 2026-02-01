import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * @fileOverview Endpoint de ingestão de analytics.
 * Registra eventos na tabela analytics_events.
 */

export async function POST(req: Request) {
  try {
    const { event_name, metadata } = await req.json();
    
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Identificar Usuário e Loja via Sessão Segura
    const { data: { user } } = await supabase.auth.getUser();
    
    let storeId = null;
    if (user) {
      // Busca rápida do contexto da loja
      const { data: ownerStore } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (ownerStore) {
        storeId = ownerStore.id;
      } else {
        const { data: memberEntry } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (memberEntry) storeId = memberEntry.store_id;
      }
    }

    // 2. Registrar na tabela analytics_events (Fonte do Dashboard Admin)
    // Usamos o Admin Client para garantir o registro mesmo em áreas restritas por RLS
    const { error } = await supabaseAdmin.from('analytics_events').insert({
      event_name,
      metadata,
      user_id: user?.id || null,
      store_id: storeId,
    });

    if (error) {
      console.error('[BACKEND_TRACK_ERROR]', error);
      // Retornamos OK mesmo com erro de insert para não derrubar o frontend
      return NextResponse.json({ ok: false, error: error.message });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[BACKEND_TRACK_EXCEPTION]', err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
