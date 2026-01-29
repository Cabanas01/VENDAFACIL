'use server';

import { createClient } from '@supabase/supabase-js';
import { addMonths } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
    const supabaseAdmin = getSupabaseAdmin();
    const cookieStore = cookies();
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                storage: {
                    getItem: (key) => cookieStore.get(key)?.value ?? null,
                    setItem: () => {},
                    removeItem: () => {},
                },
                autoRefreshToken: false,
                persistSession: false,
                storageKey: 'vendafacil-auth',
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: 'Authentication failed.' };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
    
    if (profileError || !profile?.is_admin) {
        return { error: 'Permission denied. User is not an admin.' };
    }

    return { userId: user.id };
}

type GrantPlanInput = {
    storeId: string;
    planId: 'monthly' | 'yearly';
    durationMonths: number;
}

export async function grantPlan(input: GrantPlanInput): Promise<{ success: boolean; error?: string }> {
    const adminCheck = await verifyAdmin();
    if ('error' in adminCheck) {
        return { success: false, error: adminCheck.error };
    }
    
    const supabaseAdmin = getSupabaseAdmin();
    const { storeId, planId, durationMonths } = input;
    const adminId = adminCheck.userId;

    try {
        const now = new Date();
        const accessEndDate = addMonths(now, durationMonths);
        const planName = planId === 'monthly' ? 'Mensal (Admin)' : 'Anual (Admin)';

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
                renovavel: false, // Manual grants are not auto-renewable
            }, { onConflict: 'store_id' });

        if (accessError) {
            throw new Error(`DB access upsert error: ${accessError.message}`);
        }

        const eventPayload = {
            admin_id: adminId,
            granted_plan: planId,
            duration_months: durationMonths,
        };

        const { error: eventError } = await supabaseAdmin.from('subscription_events').insert({
            provider: 'admin',
            event_type: 'ADMIN_GRANTED_PLAN',
            event_id: `admin_grant_${storeId}_${Date.now()}`,
            store_id: storeId,
            user_id: adminId, // The user performing the action
            plan_id: planId,
            raw_payload: eventPayload,
        });

        if (eventError) {
            // Log this, but don't fail the whole operation if access was granted
            console.error(`Failed to log ADMIN_GRANTED_PLAN event: ${eventError.message}`);
        }
        
        revalidatePath('/admin/stores');

        return { success: true };
    } catch (error: any) {
        console.error('Error in grantPlan server action:', error);
        return { success: false, error: error.message };
    }
}
