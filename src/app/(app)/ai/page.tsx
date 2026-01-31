import { Metadata } from 'next';
import StoreAiContent from './ai-content';

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

  return (
    <div className="space-y-6">
      <StoreAiContent isAiConfigured={isAiConfigured} />
    </div>
  );
}
