import { Metadata } from 'next';
import StoreAiContent from './ai-content';

// Forçamos o Next.js a ler as variáveis de ambiente em runtime, não no build.
// Isso resolve o problema da chave de API parecer "ausente" mesmo existindo.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Assistente de Negócios | VendaFácil',
};

/**
 * @fileOverview Página de IA (Server Component)
 * 
 * Valida a configuração do ambiente no servidor antes de renderizar a interface.
 */
export default async function StoreAiPage() {
  const isAiConfigured = !!(
    process.env.GOOGLE_GENAI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    process.env.GOOGLE_API_KEY
  );

  // Log de diagnóstico silencioso no servidor para debug técnico
  if (!isAiConfigured) {
    console.warn('[AI_CONFIG_CHECK] API Key não detectada no process.env do servidor.');
  }

  return (
    <div className="space-y-6">
      <StoreAiContent isAiConfigured={isAiConfigured} />
    </div>
  );
}
