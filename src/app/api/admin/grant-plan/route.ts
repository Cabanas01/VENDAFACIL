import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log('[grant-plan] API route invoked.');

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('UID LOGADO:', user?.id);

  if (authError || !user) {
    console.warn('[grant-plan] Authentication failed:', authError?.message || 'No user session found in cookie.');
    return NextResponse.json({ error: 'Authentication failed: No valid user session found.' }, { status: 401 });
  }

  console.log(`[grant-plan] Authenticated user ${user.id} is attempting to grant a plan.`);

  try {
    const { storeId, planId, durationMonths } = await req.json();
    if (!storeId || !planId || !durationMonths) {
      return NextResponse.json({ error: 'Invalid input: storeId, planId, and durationMonths are required.' }, { status: 400 });
    }

    // Call the secure RPC function. The user's JWT is automatically passed,
    // and `auth.uid()` will be available inside the function.
    const { error: rpcError } = await supabase.rpc('admin_grant_store_access', {
        p_store_id: storeId,
        p_plan: planId,
        p_duration_months: durationMonths,
    });

    
    if (rpcError) {
      console.error(`[grant-plan] RPC failed for user ${user.id}:`, rpcError.message);
      
      // Check if the error is the specific permission error from the RPC
      const isPermissionError = rpcError.message.toLowerCase().includes('not admin');
      
      return NextResponse.json(
        { error: isPermissionError ? 'Permission denied: User is not a global admin.' : 'Failed to grant plan in database.' },
        { status: isPermissionError ? 403 : 500 } // 403 Forbidden for permission denied, 500 for other DB errors
      );
    }

    console.log(`[grant-plan] Successfully granted plan '${planId}' to store ${storeId} by admin ${user.id}.`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[grant-plan] Unhandled exception in POST handler:', error);
    return NextResponse.json({ error: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
