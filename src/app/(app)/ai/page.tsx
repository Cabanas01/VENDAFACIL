import { Metadata } from 'next';
import StoreAiContent from './ai-content';

/**
 * @fileOverview Página de IA (Server Component)
 * 
 * REGRAS DE OURO PARA VARIÁVEIS DE AMBIENTE:
 * 1. dynamic = 'force-dynamic': Garante que o Next.js leia o .env a cada requisição.
 * 2. runtime = 'nodejs': O SDK do Gemini exige ambiente Node completo.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Assistente de Negócios | VendaFácil',
};

export default async function StoreAiPage() {
  // Verificação estrita no lado do servidor para evitar vazamento de chaves
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
