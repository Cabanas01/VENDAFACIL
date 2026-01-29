'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addDays } from 'date-fns';
import { revalidatePath } from 'next/cache';

// This helper function securely gets the user's store on the server.
async function getStoreForUser(): Promise<{ storeId: string; userId: string } | { error: string }> {
    const cookieStore = cookies();
    // Create a temporary Supabase client to get the current user from the session cookie
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
    
    const supabaseAdmin = getSupabaseAdmin();
    
    // Check if user is an owner
    const { data: ownerStore, error: ownerError } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .single();
    
    if (ownerError && ownerError.code !== 'PGRST116') { // Ignore "no rows found"
        return { error: 'Error fetching store data.' };
    }

    if (ownerStore) {
        return { storeId: ownerStore.id, userId: user.id };
    }
    
    // If not owner, check if user is a member
     const { data: memberStore, error: memberError } = await supabaseAdmin
        .from('store_members')
        .select('store_id')
        .eq('user_id', user.id)
        .single();
    
    if (memberError && memberError.code !== 'PGRST116') { // Ignore "no rows found"
        return { error: 'Error fetching member data.' };
    }
    
    if(memberStore) {
        return { storeId: memberStore.store_id, userId: user.id };
    }

    return { error: 'User is not associated with any store.' };
}

/**
 * Server action to initiate a 7-day trial for the current user's store.
 * This is secure as it runs on the server and uses the admin client.
 */
export async function startTrialAction(): Promise<{ success: boolean; error?: string }> {
    const storeInfo = await getStoreForUser();
    if ('error' in storeInfo) {
        return { success: false, error: storeInfo.error };
    }

    const { storeId } = storeInfo;
    const supabaseAdmin = getSupabaseAdmin();
    
    // Check if trial was already used for this store
    const { count, error: countError } = await supabaseAdmin
        .from('store_access')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('plano_tipo', 'free');
    
    if (countError) {
        console.error('Error checking for existing trial:', countError);
        return { success: false, error: 'Database error while checking for trial.' };
    }

    if (count && count > 0) {
        return { success: false, error: 'O período de avaliação para esta loja já foi ativado.' };
    }

    // Grant trial access
    const now = new Date();
    const trialEndDate = addDays(now, 7);
    const { error: insertError } = await supabaseAdmin.from('store_access').insert({
        store_id: storeId,
        plano_nome: 'Trial',
        plano_tipo: 'free',
        data_inicio_acesso: now.toISOString(),
        data_fim_acesso: trialEndDate.toISOString(),
        status_acesso: 'ativo',
        origem: 'billing_page',
        renovavel: false,
    });
    
    if (insertError) {
        console.error('Error inserting trial record:', insertError);
        return { success: false, error: 'Database error while starting trial.' };
    }

    revalidatePath('/billing');
    revalidatePath('/(app)', 'layout');
    return { success: true };
}
