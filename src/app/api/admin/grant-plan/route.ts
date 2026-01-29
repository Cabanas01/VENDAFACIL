import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { addMonths } from 'date-fns'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  console.log('[DEBUG] SERVICE ROLE EXISTS:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('[DEBUG] SUPABASE URL EXISTS:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const cookieStore = cookies()

  // --- ADVANCED DEBUGGING ---
  const allCookies = cookieStore.getAll();
  console.log('[DEBUG] All cookies received by server:', allCookies);
  // --- END ADVANCED DEBUGGING ---

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // --- ADVANCED DEBUGGING ---
    console.log('[DEBUG] User object from getUser():', user);
    console.log('[DEBUG] Auth error from getUser():', authError);
    // --- END ADVANCED DEBUGGING ---

    if (authError || !user) {
      console.error('API grant-plan: Authentication failed', authError);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_saas_admin');

    if (adminError || !isAdmin) {
      console.error('API grant-plan: Permission denied', adminError);
      return NextResponse.json({ error: 'Permission denied. User is not an admin.' }, { status: 403 });
    }

    const { storeId, planId, durationMonths } = await req.json();

    if (!storeId || !planId || !durationMonths) {
      return NextResponse.json({ error: 'Invalid input: storeId, planId, and durationMonths are required.' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const now = new Date();
    const endDate = addMonths(now, durationMonths);

    const planName = planId === 'monthly' ? 'Mensal (Admin)' : 'Anual (Admin)';

    const { error: accessError } = await supabaseAdmin
      .from('store_access')
      .upsert({
        store_id: storeId,
        plano_nome: planName,
        plano_tipo: planId,
        data_inicio_acesso: now.toISOString(),
        data_fim_acesso: endDate.toISOString(),
        status_acesso: 'ativo',
        origem: 'manual_admin',
        renovavel: false,
      }, { onConflict: 'store_id' });

    if (accessError) {
      console.error('API grant-plan: DB access upsert failed', accessError);
      return NextResponse.json({ error: 'Failed to grant plan in database.' }, { status: 500 });
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
    // This will catch errors from getSupabaseAdmin() if env vars are missing
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
