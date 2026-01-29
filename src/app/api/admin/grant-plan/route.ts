import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addMonths } from 'date-fns';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  console.log('[DEBUG] SERVICE ROLE EXISTS:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('[DEBUG] SUPABASE URL EXISTS:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Verify if the user is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Permission denied. User is not an admin.' }, { status: 403 });
    }

    const { storeId, planId, durationMonths } = await request.json();

    if (!storeId || !planId || !durationMonths) {
      return NextResponse.json({ error: 'Invalid input. Missing storeId, planId, or durationMonths.' }, { status: 400 });
    }

    const now = new Date();
    const accessEndDate = addMonths(now, durationMonths);
    const planName = planId === 'monthly' ? 'Mensal (Admin)' : 'Anual (Admin)';

    // Grant access
    const { error: accessError } = await supabaseAdmin
      .from('store_access')
      .upsert({
        store_id: storeId,
        plano_nome: planName,
        plano_tipo: planId,
        data_inicio_acesso: now.toISOString(),
        data_fim_acesso: accessEndDate.toISOString(),
        status_acesso: 'ativo',
        origem: 'admin',
        renovavel: false,
      }, { onConflict: 'store_id' });

    if (accessError) throw new Error(`DB access upsert error: ${accessError.message}`);

    // Log the event
    const eventPayload = {
      admin_id: user.id,
      granted_plan: planId,
      duration_months: durationMonths,
    };
    const { error: eventError } = await supabaseAdmin.from('subscription_events').insert({
      provider: 'admin',
      event_type: 'ADMIN_GRANTED_PLAN',
      event_id: `admin_grant_${storeId}_${Date.now()}`,
      store_id: storeId,
      user_id: user.id,
      plan_id: planId,
      raw_payload: eventPayload,
    });

    if (eventError) {
      console.warn(`Failed to log ADMIN_GRANTED_PLAN event: ${eventError.message}`);
    }
    
    revalidatePath('/admin');

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in grant-plan API route:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
