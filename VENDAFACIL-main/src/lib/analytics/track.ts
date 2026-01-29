'use client';

import { useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { getOrCreateSessionId, getDeviceType, getUserAgent } from './session';

export function useAnalytics() {
  const { user, store } = useAuth();

  const updateSession = useDebouncedCallback(async (sessionId: string) => {
    if (!store || !user || !sessionId) return;
    
    await supabase.from('user_sessions').upsert({
      session_id: sessionId,
      store_id: store.id,
      user_id: user.id,
      last_seen_at: new Date().toISOString(),
      user_agent: getUserAgent(),
      device_type: getDeviceType(),
    }, { onConflict: 'session_id' });
  }, 10000); // Update session last_seen_at at most every 10 seconds

  const trackEvent = useCallback(async (
    eventName: string,
    metadata: Record<string, any> = {},
    eventGroup: string = 'analytics'
  ) => {
    if (!user || !store) return;

    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    await supabase.from('user_events').insert({
      store_id: store.id,
      user_id: user.id,
      session_id: sessionId,
      event_name: eventName,
      event_group: eventGroup,
      metadata,
    });
    
    // Also update the session on any tracked event
    updateSession(sessionId);

  }, [user, store, updateSession]);

  const trackReportOpened = useCallback((reportName: string) => {
    trackEvent('report_opened', { report: reportName });
  }, [trackEvent]);
  
  const registerUniqueClick = useCallback(async (target: string, metadata: Record<string, any> = {}) => {
      if (!user || !store) return;
      const sessionId = getOrCreateSessionId();
      await supabase.rpc('rpc_register_unique_click', {
          p_store_id: store.id,
          p_session_id: sessionId,
          p_target: target,
          p_metadata: metadata
      });
      updateSession(sessionId);
  }, [user, store, updateSession]);

  return { trackEvent, trackReportOpened, registerUniqueClick };
}
