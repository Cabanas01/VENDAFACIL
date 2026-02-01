'use client';

/**
 * @fileOverview Componente para injeção condicional do Google AdSense.
 * 
 * Exibe anúncios apenas para usuários que NÃO possuem um plano pago ativo
 * e que NÃO estão na tela de autenticação.
 */

import Script from 'next/script';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function AdSenseScript() {
  const pathname = usePathname();
  const { accessStatus } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 1. Bloqueio por Rota (Não exibir no login ou signup)
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname?.startsWith('/auth');
  if (isAuthPage) {
    return null;
  }

  // 2. Bloqueio por Plano (Não exibir para pagadores)
  const paidPlans = ['semanal', 'mensal', 'anual', 'vitalicio', 'weekly', 'monthly', 'yearly'];
  const isPaidUser = accessStatus?.acesso_liberado && 
                     paidPlans.includes(accessStatus?.plano_tipo?.toLowerCase() || '');

  if (isPaidUser) {
    return null;
  }

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7101977987227464"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
