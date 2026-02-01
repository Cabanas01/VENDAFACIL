import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { addDays } from 'date-fns';

/**
 * @fileOverview Webhook Enterprise do Hotmart
 * 
 * Implementa:
 * 1. Idempotência estrita baseada no ID do evento.
 * 2. Logging detalhado para auditoria e suporte.
 * 3. Validação de token simplificada (padrão Hotmart).
 * 4. Mapeamento de planos compatível com check constraints do banco.
 */

const HOTMART_WEBHOOK_SECRET = process.env.HOTMART_WEBHOOK_SECRET;

async function logEvent(payload: any, status: string, details: object = {}) {
    const supabaseAdmin = getSupabaseAdmin();
    const { event, data, id: event_id } = payload;
    
    // Extração segura da referência externa
    const externalRef = data?.purchase?.external_reference || data?.subscription?.external_reference || '||';
    const [store_id, plan_id, user_id] = externalRef.split('|');

    await supabaseAdmin.from('subscription_events').insert({
        provider: 'hotmart',
        event_type: event,
        event_id: event_id || `legacy_${Date.now()}`, 
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

  // 1. Validação de Segurança (Token Simples)
  if (HOTMART_WEBHOOK_SECRET && hottok !== HOTMART_WEBHOOK_SECRET) {
      console.warn('[WEBHOOK_HOTMART] Token inválido ou ausente');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    // 2. Idempotência: Evita processar o mesmo evento duas vezes
    const eventId = payload.id;
    if (eventId) {
        const { data: existingEvent } = await supabaseAdmin
            .from('subscription_events')
            .select('id')
            .eq('event_id', eventId)
            .maybeSingle();

        if (existingEvent) {
            console.log(`[WEBHOOK_HOTMART] Evento ${eventId} já processado. Ignorando.`);
            return NextResponse.json({ success: true, message: 'Already processed' });
        }
    }

    const { event, data } = payload;
    const externalReference = data?.purchase?.external_reference || data?.subscription?.external_reference;

    // Se for um evento de faturamento crítico mas não tiver referência, logamos o erro
    if (!externalReference && ['PURCHASE_APPROVED', 'SUBSCRIPTION_RENEWED', 'PLAN_CHANGED'].includes(event)) {
      await logEvent(payload, 'error_missing_ref');
      return NextResponse.json({ success: true, message: 'Missing reference' });
    }

    const [store_id, plan_id] = (externalReference || '||').split('|');

    let durationDays: number;
    let planName: string;
    let finalPlanType: "semanal" | "mensal" | "anual" | "trial";

    switch (event) {
      case 'PURCHASE_APPROVED':
      case 'SUBSCRIPTION_RENEWED':
      case 'PLAN_CHANGED':
        if (!store_id) return NextResponse.json({ success: true });

        // Normalização rigorosa para o Banco de Dados
        const pid = (plan_id || '').toLowerCase();
        if (pid === 'weekly' || pid === 'semanal') {
          durationDays = 7;
          planName = 'Semanal';
          finalPlanType = 'semanal';
        } else if (pid === 'monthly' || pid === 'mensal') {
          durationDays = 30;
          planName = 'Mensal';
          finalPlanType = 'mensal';
        } else if (pid === 'yearly' || pid === 'anual') {
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

        // Atualização de acesso via Admin (ignora RLS)
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
      case 'CHARGEBACK':
         if (store_id) {
            await supabaseAdmin
                .from('store_access')
                .update({ status_acesso: 'bloqueado', renovavel: false })
                .eq('store_id', store_id);
            await logEvent(payload, 'processed_access_revoked');
        }
        break;
      
      default:
        // Outros eventos apenas para log de analytics
        await logEvent(payload, 'logged_for_analytics');
        break;
    }
    
    return NextResponse.json({ success: true });

  } catch (error: any) {
      console.error('[WEBHOOK_HOTMART_FATAL]', error);
      await logEvent(payload, 'error_exception', { error: error.message });
      return NextResponse.json({ success: true, message: 'Handled with errors' });
  }
}
