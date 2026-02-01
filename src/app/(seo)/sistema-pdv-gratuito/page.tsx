import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Sistema PDV Gratuito: Gestão de Vendas e Estoque Grátis | VendaFácil',
  description: 'O melhor sistema PDV gratuito para sua loja. Controle faturamento, caixa e estoque sem mensalidade no período de avaliação. Simples e ágil.',
};

export default function SistemaPDVGratuitoPage() {
  return (
    <SEOTemplate
      title="Sistema PDV Gratuito para Pequenos Comércios"
      subtitle="Gestão profissional e automatizada ao alcance de todos os lojistas."
      content={
        <div className="space-y-10">
          <section>
            <h2>Como um Sistema PDV Gratuito ajuda no seu lucro</h2>
            <p>Organizar as vendas com um <strong>sistema PDV gratuito</strong> evita desperdícios e perdas de estoque. No VendaFácil, focamos em dar poder ao lojista iniciante.</p>
          </section>
        </div>
      }
    />
  );
}
