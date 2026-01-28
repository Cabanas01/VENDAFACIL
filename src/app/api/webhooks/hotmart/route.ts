import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { addDays } from 'date-fns';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HOTMART_WEBHOOK_SECRET = process.env.HOTMART_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const rawBody = await request.text();
  
  if (HOTMART_WEBHOOK_SECRET) {
      const hottok = request.headers.get('Hottok');
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
    if (payload.event === 'PURCHASE_APPROVED') {
      const purchase = payload.data.purchase;
      const externalReference = purchase.external_reference;

      if (!externalReference) {
        console.error('Hotmart webhook: Missing external_reference', payload);
        await supabaseAdmin.from('subscription_events').insert({
            provider: 'hotmart',
            status: 'error_missing_ref',
            raw_payload: payload
        });
        return NextResponse.json({ success: true, message: 'Missing external_reference' });
      }

      const [store_id, plan_id, user_id] = externalReference.split('|');

      if (!store_id || !plan_id || !user_id) {
        console.error('Hotmart webhook: Invalid external_reference format', externalReference);
        await supabaseAdmin.from('subscription_events').insert({
            provider: 'hotmart',
            status: 'error_invalid_ref',
            raw_payload: payload
        });
        return NextResponse.json({ success: true, message: 'Invalid external_reference' });
      }

      let durationDays: number;
      let planName: string;

      switch (plan_id) {
        case 'weekly':
          durationDays = 7;
          planName = 'Semanal';
          break;
        case 'monthly':
          durationDays = 30;
          planName = 'Mensal';
          break;
        case 'yearly':
          durationDays = 365;
          planName = 'Anual';
          break;
        default:
          console.error('Hotmart webhook: Unknown plan_id', plan_id);
          await supabaseAdmin.from('subscription_events').insert({
            provider: 'hotmart',
            plan_id,
            store_id,
            status: 'error_unknown_plan',
            raw_payload: payload
          });
          return NextResponse.json({ success: true, message: 'Unknown plan_id' });
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
            renovavel: true
        }, { onConflict: 'store_id' });

      if (accessError) {
        console.error('Hotmart webhook: Failed to update store_access', accessError);
        await supabaseAdmin.from('subscription_events').insert({
            provider: 'hotmart',
            plan_id,
            store_id,
            status: 'error_db_update',
            raw_payload: { ...payload, db_error: accessError.message }
        });
        return NextResponse.json({ success: true, message: 'DB update failed but acknowledged' });
      }

      await supabaseAdmin.from('subscription_events').insert({
          provider: 'hotmart',
          plan_id,
          store_id,
          status: 'processed',
          raw_payload: payload
      });

    }
    
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
      console.error('Hotmart webhook: Unhandled exception', error);
      await supabaseAdmin.from('subscription_events').insert({
            provider: 'hotmart',
            status: 'error_exception',
            raw_payload: { payload, error: error.message }
      });
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
