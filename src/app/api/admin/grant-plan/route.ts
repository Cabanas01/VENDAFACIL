import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // 1. Create a Supabase client that can read the user's session from the cookies
    const supabase = createSupabaseServerClient();
    
    // 2. Get the current user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[grant-plan] Authentication error:', authError?.message);
      return NextResponse.json({ error: 'Authentication failed: No valid user session found.' }, { status: 401 });
    }
    
    console.log(`[grant-plan] Authenticated user ${user.id} attempting to grant plan.`);

    // 3. Get the request body
    const { storeId, planId, durationMonths } = await req.json();
    if (!storeId || !planId || !durationMonths) {
      return NextResponse.json({ error: 'Invalid input: storeId, planId, and durationMonths are required.' }, { status: 400 });
    }

    // 4. Call the secure RPC function.
    // The user's JWT is automatically passed, and `auth.uid()` will be available inside the RPC function.
    // The RPC's internal security (`SECURITY DEFINER` and admin check) will handle authorization.
    const { error: rpcError } = await supabase.rpc('admin_grant_store_access', {
        p_store_id: storeId,
        p_plan: planId,
        p_duration_months: durationMonths,
    });

    if (rpcError) {
      // The RPC failed. This is likely because the user is not an admin.
      console.error(`[grant-plan] RPC failed for user ${user.id}:`, rpcError.message);
      
      // Provide a more specific error message based on the RPC's exception.
      const errorMessage = rpcError.message.includes('not admin')
        ? 'Permission denied. User is not an admin.'
        : 'Failed to grant plan in database.';
        
      return NextResponse.json({ error: errorMessage }, { status: 403 }); // 403 Forbidden is more appropriate
    }

    console.log(`[grant-plan] Successfully granted plan '${planId}' to store ${storeId} by admin ${user.id}.`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[grant-plan] Unhandled exception:', error);
    return NextResponse.json({ error: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
