'use client';

import { getOrCreateSessionId, getDeviceType, getUserAgent } from './session';

/**
 * Declaração global para o Google Analytics
 */
declare global {
  interface Window {
    gtag: (command: string, name: string, params?: any) => void;
  }
}

/**
 * Função central de rastreio (Frontend)
 * Sincroniza Google Analytics e o Backend do VendaFácil.
 */
export async function trackEvent(
  eventName: string, 
  metadata: Record<string, any> = {}
) {
  const sessionId = getOrCreateSessionId();
  
  const params = {
    ...metadata,
    session_id: sessionId,
    device_type: getDeviceType(),
    user_agent: getUserAgent(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString(),
  };

  // 1. Enviar para o Google Analytics (se disponível)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }

  // 2. Enviar para o nosso Backend (Endpoint Interno)
  // Usamos fetch/background para não bloquear a experiência do usuário
  try {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        metadata: params,
      }),
    });
  } catch (err) {
    // Analytics falhar não deve quebrar o app
    console.warn('[ANALYTICS_SYNC_FAILED]', err);
  }
}

/**
 * Hook para uso em componentes React
 */
export function useAnalytics() {
  return {
    trackEvent,
    trackReportOpened: (reportName: string) => trackEvent('report_opened', { report: reportName }),
    trackAction: (actionName: string, details: any = {}) => trackEvent(`action_${actionName}`, details),
  };
}
