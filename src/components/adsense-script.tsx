'use client';

/**
 * @fileOverview Componente para injeção condicional do Google AdSense.
 * 
 * Exibe anúncios apenas para usuários que NÃO possuem um plano pago ativo.
 */

import Script from 'next/script';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState } from 'react';

export function AdSenseScript() {
  const { accessStatus, storeStatus } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Lista de planos que removem anúncios
  const paidPlans = ['semanal', 'mensal', 'anual', 'vitalicio', 'weekly', 'monthly', 'yearly'];
  
  // Verifica se o usuário é um pagador ativo
  const isPaidUser = accessStatus?.acesso_liberado && 
                     paidPlans.includes(accessStatus?.plano_tipo?.toLowerCase() || '');

  // Se for usuário pago, não renderiza nada (remove o script)
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
