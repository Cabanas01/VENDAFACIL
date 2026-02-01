'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics/track';

/**
 * Monitora mudanças de rota e dispara eventos automáticos sincronizados.
 */
function TrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const fullPath = searchParams?.toString() 
      ? `${pathname}?${searchParams.toString()}` 
      : pathname;

    trackEvent('page_view', {
      page_path: pathname,
      page_url: fullPath,
      page_title: typeof document !== 'undefined' ? document.title : 'VendaFácil',
    });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}