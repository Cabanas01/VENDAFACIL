'use client';

const SESSION_KEY = 'vf_session_id';

/**
 * Recupera ou cria um ID de sessão persistente.
 * Implementação segura com try-catch para evitar crash em ambientes que bloqueiam localStorage.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  try {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch (err) {
    console.warn('[SESSION_ID_ACCESS_DENIED] Usando fallback volátil.');
    return 'volatile_' + Math.random().toString(36).substring(7);
  }
}

export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
   if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export function getUserAgent(): string {
   if (typeof window === 'undefined') return '';
  return navigator.userAgent;
}
