import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Controle de Estoque PDV: Gestão de Inventário Inteligente | VendaFácil',
  description: 'Domine seu inventário com o controle de estoque integrado do VendaFácil. Alertas de estoque baixo e baixa automática em cada venda.',
};

export default function PDVControleEstoquePage() {
  return (
    <SEOTemplate
      title="Controle de Estoque Inteligente no seu PDV"
      subtitle="Nunca mais perca uma venda por falta de mercadoria na prateleira."
      content={
        <div className="space-y-10">
          <section>
            <h2>A união entre Venda e Estoque</h2>
            <p>Cada venda realizada no PDV deve baixar o estoque instantaneamente. O <strong>controle de estoque</strong> do VendaFácil garante precisão absoluta.</p>
          </section>
        </div>
      }
    />
  );
}
