'use client';

/**
 * @fileOverview Componente para injeção condicional do Google AdSense.
 * 
 * Exibe anúncios apenas para usuários que NÃO possuem um plano pago ativo.
 * Para a verificação do Google, o script deve estar acessível no HTML inicial (SSR)
 * para que o rastreador (crawler) consiga validar a propriedade do site.
 */

import Script from 'next/script';
import { useAuth } from '@/components/auth-provider';

export function AdSenseScript() {
  const { accessStatus } = useAuth();

  /**
   * Lógica de Bloqueio por Plano:
   * Durante o SSR (Server-Side Rendering), accessStatus será nulo.
   * Isso é fundamental para que o rastreador do AdSense (que não tem sessão)
   * veja o script no HTML estático e valide o site com sucesso.
   * 
   * Se o usuário estiver logado e possuir um plano pago, o script será 
   * removido automaticamente após a hidratação no navegador.
   */
  const paidPlans = ['semanal', 'mensal', 'anual', 'vitalicio', 'weekly', 'monthly', 'yearly'];
  const isPaidUser = accessStatus?.acesso_liberado && 
                     paidPlans.includes(accessStatus?.plano_tipo?.toLowerCase() || '');

  if (isPaidUser) {
    return null;
  }

  return (
    <Script
      id="adsense-init"
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7101977987227464"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
