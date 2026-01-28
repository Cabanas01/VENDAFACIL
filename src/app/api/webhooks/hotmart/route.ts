import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { addDays } from 'date-fns';

const HOTMART_WEBHOOK_SECRET = process.env.HOTMART_WEBHOOK_SECRET;

async function logEvent(payload: any, status: string, details: object = {}) {
    const supabaseAdmin = getSupabaseAdmin();
    const { event, data } = payload;
    const [store_id, plan_id, user_id] = (data.purchase?.external_reference || '||').split('|');

    await supabaseAdmin.from('subscription_events').insert({
        provider: 'hotmart',
        event_type: event,
        event_id: payload.id, // Hotmart provides a unique ID for each event
        store_id: store_id || null,
        plan_id: plan_id || null,
        user_id: user_id || null,
        status: status,
        raw_payload: { ...payload, ...details },
    });
}

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const rawBody = await request.text();
  
  if (HOTMART_WEBHOOK_SECRET) {
      const hottok = request.headers.get('hottok'); // Hotmart sends header in lowercase
      const hash = crypto
        .createHmac('sha256', HOTMART_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (hash !== hottok) {
          console.warn('Hotmart webhook: Invalid signature');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
  } else {
      console.warn('Hotmart webhook: HOTMART_WEBHOOK_SECRET is not set. Skipping validation.');
  }

  const payload = JSON.parse(rawBody);

  try {
    // Idempotency check
    const { data: existingEvent, error: checkError } = await supabaseAdmin
        .from('subscription_events')
        .select('id')
        .eq('event_id', payload.id)
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // Ignore "no rows found" error
        throw new Error(`DB idempotency check failed: ${checkError.message}`);
    }

    if (existingEvent) {
        return NextResponse.json({ success: true, message: 'Event already processed' }, { status: 200 });
    }

    const { event, data } = payload;
    const externalReference = data.purchase?.external_reference;

    if (!externalReference && ['PURCHASE_APPROVED', 'SUBSCRIPTION_CANCELED'].includes(event)) {
      await logEvent(payload, 'error_missing_ref');
      return NextResponse.json({ success: true, message: 'Acknowledged, but missing external_reference' });
    }

    const [store_id, plan_id, user_id] = (externalReference || '||').split('|');

    let durationDays: number;
    let planName: string;

    switch (event) {
      case 'PURCHASE_APPROVED':
      case 'SUBSCRIPTION_RENEWED':
      case 'PLAN_CHANGED':
        if (!store_id || !plan_id || !user_id) {
            await logEvent(payload, 'error_invalid_ref');
            return NextResponse.json({ success: true, message: 'Acknowledged, but invalid external_reference' });
        }
        
        switch (plan_id) {
          case 'weekly': durationDays = 7; planName = 'Semanal'; break;
          case 'monthly': durationDays = 30; planName = 'Mensal'; break;
          case 'yearly': durationDays = 365; planName = 'Anual'; break;
          default:
            await logEvent(payload, 'error_unknown_plan');
            return NextResponse.json({ success: true, message: 'Acknowledged, but unknown plan_id' });
        }
        
        const now = new Date();
        const accessEndDate = addDays(now, durationDays);

        const { error: accessError } = await supabaseAdmin
          .from('store_access')
          .upsert({
              store_id: store_id,
              plano_nome: planName,
              plano_tipo: plan_id,
              data_inicio_acesso: now.toISOString(),
              data_fim_acesso: accessEndDate.toISOString(),
              status_acesso: 'ativo',
              origem: 'hotmart',
              renovavel: true,
          }, { onConflict: 'store_id' });

        if (accessError) {
          await logEvent(payload, 'error_db_update', { db_error: accessError.message });
          throw new Error(`DB access upsert failed: ${accessError.message}`);
        }
        
        await logEvent(payload, 'processed_access_granted');
        break;

      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'CHARGEBACK':
      case 'SUBSCRIPTION_CANCELED':
         if (!store_id) {
            await logEvent(payload, 'error_missing_ref_for_cancellation');
            return NextResponse.json({ success: true, message: 'Acknowledged, but missing store_id for cancellation' });
        }

        const { error: cancelError } = await supabaseAdmin
            .from('store_access')
            .update({ status_acesso: 'bloqueado', renovavel: false })
            .eq('store_id', store_id);

        if (cancelError) {
             await logEvent(payload, 'error_db_update', { db_error: cancelError.message });
             // Don't throw, just log, as this is a critical notification.
             console.error(`Failed to block access for store ${store_id}:`, cancelError.message);
        }

        await logEvent(payload, 'processed_access_revoked');
        break;
      
      default:
        // For any other event, we just log it for analytics without changing access.
        await logEvent(payload, 'logged_for_analytics');
        break;
    }
    
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
      console.error('Hotmart webhook: Unhandled exception', error);
      await logEvent(payload, 'error_exception', { error: error.message });
      // Return 200 so Hotmart doesn't keep retrying on a code-level error.
      return NextResponse.json({ success: true, message: 'Exception handled, see logs.' }, { status: 200 });
  }
}
