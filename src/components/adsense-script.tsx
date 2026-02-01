'use client';

/**
 * @fileOverview Componente para injeção condicional do Google AdSense.
 * 
 * Exibe anúncios apenas para usuários que NÃO possuem um plano pago ativo.
 * Para a verificação do Google, o script deve estar acessível nas páginas públicas (como o Login).
 */

import Script from 'next/script';
import { useAuth } from '@/components/auth-provider';
import { useEffect, useState } from 'react';

export function AdSenseScript() {
  const { accessStatus } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Bloqueio por Plano: Não carregar para usuários que já pagaram
  const paidPlans = ['semanal', 'mensal', 'anual', 'vitalicio', 'weekly', 'monthly', 'yearly'];
  const isPaidUser = accessStatus?.acesso_liberado && 
                     paidPlans.includes(accessStatus?.plano_tipo?.toLowerCase() || '');

  if (isPaidUser) {
    return null;
  }

  // Nota: O robô do AdSense precisa encontrar este script para verificar o site.
  // Como o sistema redireciona visitantes anônimos para o login, o script DEVE estar lá.
  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7101977987227464"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
