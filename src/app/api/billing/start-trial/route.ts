import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
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
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
          }
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }

  // Find the user's store
  let storeId: string | null = null;

  const { data: ownerStore, error: ownerError } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (ownerError) {
    console.error('Error fetching owner store:', ownerError);
    return NextResponse.json({ error: 'Failed to fetch store data' }, { status: 500 });
  }

  if (ownerStore) {
    storeId = ownerStore.id;
  } else {
    const { data: memberStore, error: memberError } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (memberError) {
      console.error('Error fetching member store:', memberError);
      return NextResponse.json({ error: 'Failed to fetch store data' }, { status: 500 });
    }
    if (memberStore) {
      storeId = memberStore.store_id;
    }
  }
  
  if (!storeId) {
    return NextResponse.json({ error: 'User is not associated with any store' }, { status: 404 });
  }
  
  // Call the RPC function to start the trial
  const { data, error: rpcError } = await supabase.rpc('start_trial', {
    p_store_id: storeId,
    p_user_id: user.id
  });

  if (rpcError) {
    console.error('RPC start_trial error:', rpcError);
    return NextResponse.json({ error: 'Failed to start trial' }, { status: 500 });
  }

  if (data && !data.success) {
    const reason = data.reason === 'already_used' ? 'Período de avaliação já foi utilizado.' : 'Não foi possível iniciar a avaliação.';
    return NextResponse.json({ error: reason }, { status: 409 }); // 409 Conflict
  }

  return NextResponse.json({ success: true });
}
