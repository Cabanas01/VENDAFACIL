import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addDays } from 'date-fns';

const HOTMART_WEBHOOK_SECRET = process.env.HOTMART_WEBHOOK_SECRET;

async function logEvent(payload: any, status: string, details: object = {}) {
    const supabaseAdmin = getSupabaseAdmin();
    const { event, data } = payload;
    const externalRef = data?.purchase?.external_reference || data?.subscription?.external_reference || '||';
    const [store_id, plan_id, user_id] = externalRef.split('|');

    await supabaseAdmin.from('subscription_events').insert({
        provider: 'hotmart',
        event_type: event,
        event_id: payload.id, 
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
  const hottok = request.headers.get('hottok');

  // Validação simplificada para o hottok padrão do Hotmart
  if (HOTMART_WEBHOOK_SECRET && hottok !== HOTMART_WEBHOOK_SECRET) {
      console.warn('Hotmart webhook: Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  try {
    // Idempotência
    const { data: existingEvent } = await supabaseAdmin
        .from('subscription_events')
        .select('id')
        .eq('event_id', payload.id)
        .maybeSingle();

    if (existingEvent) {
        return NextResponse.json({ success: true, message: 'Already processed' });
    }

    const { event, data } = payload;
    const externalReference = data?.purchase?.external_reference || data?.subscription?.external_reference;

    if (!externalReference && ['PURCHASE_APPROVED', 'SUBSCRIPTION_RENEWED', 'PLAN_CHANGED'].includes(event)) {
      await logEvent(payload, 'error_missing_ref');
      return NextResponse.json({ success: true, message: 'Missing external_reference' });
    }

    const [store_id, plan_id, user_id] = (externalReference || '||').split('|');

    let durationDays: number;
    let planName: string;
    let finalPlanType: "semanal" | "mensal" | "anual" | "trial";

    switch (event) {
      case 'PURCHASE_APPROVED':
      case 'SUBSCRIPTION_RENEWED':
      case 'PLAN_CHANGED':
        if (!store_id) return NextResponse.json({ success: true });

        const normalizedPlanId = (plan_id || '').toLowerCase();
        
        if (normalizedPlanId === 'weekly' || normalizedPlanId === 'semanal') {
          durationDays = 7;
          planName = 'Semanal';
          finalPlanType = 'semanal';
        } else if (normalizedPlanId === 'monthly' || normalizedPlanId === 'mensal') {
          durationDays = 30;
          planName = 'Mensal';
          finalPlanType = 'mensal';
        } else if (normalizedPlanId === 'yearly' || normalizedPlanId === 'anual') {
          durationDays = 365;
          planName = 'Anual';
          finalPlanType = 'anual';
        } else {
          durationDays = 7;
          planName = 'Avaliação';
          finalPlanType = 'trial';
        }
        
        const now = new Date();
        const accessEndDate = addDays(now, durationDays);

        const { error: accessError } = await supabaseAdmin
          .from('store_access')
          .upsert({
              store_id: store_id,
              plano_nome: planName,
              plano_tipo: finalPlanType,
              data_inicio_acesso: now.toISOString(),
              data_fim_acesso: accessEndDate.toISOString(),
              status_acesso: 'ativo',
              origem: 'hotmart',
              renovavel: true,
          }, { onConflict: 'store_id' });

        if (accessError) {
          await logEvent(payload, 'error_db_update', { db_error: accessError.message });
          throw new Error(accessError.message);
        }
        
        await logEvent(payload, 'processed_access_granted');
        break;

      case 'PURCHASE_CANCELED':
      case 'PURCHASE_REFUNDED':
      case 'SUBSCRIPTION_CANCELED':
         if (store_id) {
            await supabaseAdmin
                .from('store_access')
                .update({ status_acesso: 'bloqueado', renovavel: false })
                .eq('store_id', store_id);
            await logEvent(payload, 'processed_access_revoked');
        }
        break;
      
      default:
        await logEvent(payload, 'logged_for_analytics');
        break;
    }
    
    return NextResponse.json({ success: true });

  } catch (error: any) {
      await logEvent(payload, 'error_exception', { error: error.message });
      return NextResponse.json({ success: true });
  }
}