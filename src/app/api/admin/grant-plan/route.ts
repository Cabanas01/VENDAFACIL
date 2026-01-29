import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addMonths } from 'date-fns';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createSupabaseServerClient();

  const allCookieNames = cookieStore.getAll().map((c) => c.name);
  console.log('[DEBUG] All cookie names on server:', allCookieNames);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[DEBUG] User ID from server:', user?.id ?? 'null');

  if (!user) {
    console.error('API grant-plan: Authentication failed. User is null.');
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }

  try {
    const { data: isAdmin, error: adminError } = await supabase.rpc(
      'is_saas_admin'
    );

    if (adminError || !isAdmin) {
      console.error('API grant-plan: Permission denied', adminError);
      return NextResponse.json(
        { error: 'Permission denied. User is not an admin.' },
        { status: 403 }
      );
    }

    const { storeId, planId, durationMonths } = await req.json();

    if (!storeId || !planId || !durationMonths) {
      return NextResponse.json(
        {
          error:
            'Invalid input: storeId, planId, and durationMonths are required.',
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      // This case handles if the admin client itself fails to initialize
      return NextResponse.json(
        { error: 'Admin client failed to initialize on the server.' },
        { status: 500 }
      );
    }

    const now = new Date();
    const endDate = addMonths(now, durationMonths);

    const planName = planId === 'monthly' ? 'Mensal (Admin)' : 'Anual (Admin)';

    const { error: accessError } = await supabaseAdmin
      .from('store_access')
      .upsert(
        {
          store_id: storeId,
          plano_nome: planName,
          plano_tipo: planId,
          data_inicio_acesso: now.toISOString(),
          data_fim_acesso: endDate.toISOString(),
          status_acesso: 'ativo',
          origem: 'manual_admin',
          renovavel: false,
        },
        { onConflict: 'store_id' }
      );

    if (accessError) {
      console.error('API grant-plan: DB access upsert failed', accessError);
      return NextResponse.json(
        { error: 'Failed to grant plan in database.' },
        { status: 500 }
      );
    }

    await supabaseAdmin.from('subscription_events').insert({
      provider: 'admin',
      event_type: 'ADMIN_GRANTED_PLAN',
      event_id: `admin_${storeId}_${Date.now()}`,
      store_id: storeId,
      user_id: user.id,
      plan_id: planId,
      raw_payload: { durationMonths },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API grant-plan: Unhandled exception', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
