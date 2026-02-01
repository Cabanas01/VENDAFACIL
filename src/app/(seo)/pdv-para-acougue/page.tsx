import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para Açougue: Controle de Carnes e Pesagem | VendaFácil',
  description: 'O sistema PDV perfeito para açougues e casas de carnes. Agilidade no atendimento, controle de estoque por peso e gestão financeira completa.',
};

export default function PDVAcouguePage() {
  return (
    <SEOTemplate
      title="Sistema PDV Especializado para Açougues"
      subtitle="Atendimento rápido e controle total do seu balcão de carnes."
      content={
        <div className="space-y-10">
          <section>
            <h2>A importância da agilidade no açougue</h2>
            <p>O cliente quer o corte certo e rapidez no pagamento. Um <strong>PDV para açougue</strong> deve ser intuitivo para não gerar filas.</p>
          </section>
        </div>
      }
    />
  );
}
