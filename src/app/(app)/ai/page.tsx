import { Metadata } from 'next';
import StoreAiContent from './ai-content';

/**
 * @fileOverview Página de IA (Server Component Burro)
 * 
 * Seguindo a Regra de Ouro: Este componente não sabe que a IA existe.
 * Ele apenas renderiza o layout e o componente de cliente.
 */

export const metadata: Metadata = {
  title: 'Assistente de Negócios | VendaFácil',
};

export default function StoreAiPage() {
  return (
    <div className="space-y-6">
      <StoreAiContent />
    </div>
  );
}
