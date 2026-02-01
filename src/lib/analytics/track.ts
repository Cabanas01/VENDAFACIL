'use client';

import { getOrCreateSessionId, getDeviceType, getUserAgent } from './session';

/**
 * Captura parâmetros de UTM da URL para rastreio de marketing.
 */
function getUtmParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || 'direto',
    medium: params.get('utm_medium') || 'nenhum',
    campaign: params.get('utm_campaign') || 'nenhuma',
    content: params.get('utm_content') || 'nenhum',
    term: params.get('utm_term') || 'nenhum',
  };
}

/**
 * Central de Rastreamento Unificada (Frontend)
 * Sincroniza Google Analytics e Banco de Dados Interno.
 */
export async function trackEvent(
  eventName: string, 
  metadata: Record<string, any> = {}
) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();
  const utms = getUtmParams();
  const timestamp = new Date().toISOString();
  
  const payload = {
    ...metadata,
    ...utms,
    session_id: sessionId,
    device_type: getDeviceType(),
    user_agent: getUserAgent(),
    url: window.location.href,
    timestamp,
  };

  // 1. Google Analytics Mirror
  if (window.gtag) {
    window.gtag('event', eventName, payload);
  }

  // 2. Internal Database Store
  try {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        metadata: payload,
      }),
    });
  } catch (err) {
    console.warn('[TRACK_EVENT_FAIL]', err);
  }
}

export function useAnalytics() {
  return {
    trackEvent,
    trackAction: (action: string, data?: any) => trackEvent(`action_${action}`, data),
    trackReport: (name: string) => trackEvent('report_viewed', { report_name: name })
  };
}
