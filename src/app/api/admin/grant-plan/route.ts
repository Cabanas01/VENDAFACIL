import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addMonths } from 'date-fns';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Use the server client to securely get the user session from cookies
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // This is the point of failure. If no cookie is sent, user is null.
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  // With a valid user, proceed to check for admin privileges.
  try {
    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_saas_admin');

    if (adminCheckError || !isAdmin) {
      console.error('API grant-plan: Permission denied.', { userId: user.id, adminCheckError });
      return NextResponse.json({ error: 'Permission denied. User is not an admin.' }, { status: 403 });
    }

    const { storeId, planId, durationMonths } = await req.json();
    if (!storeId || !planId || !durationMonths) {
      return NextResponse.json({ error: 'Invalid input: storeId, planId, and durationMonths are required.' }, { status: 400 });
    }

    // Only after user is authenticated and verified as admin, use the elevated-privilege client.
    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date();
    const endDate = addMonths(now, durationMonths);
    const planName = planId === 'monthly' ? 'Mensal (Admin)' : 'Anual (Admin)';

    const { error: accessError } = await supabaseAdmin.from('store_access').upsert(
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
      return NextResponse.json({ error: 'Failed to grant plan in database.' }, { status: 500 });
    }

    // Log the administrative action for auditing.
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
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
