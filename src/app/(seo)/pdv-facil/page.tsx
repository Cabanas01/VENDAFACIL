import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV Fácil: Sistema de Vendas Intuitivo e Rápido | VendaFácil',
  description: 'O sistema de vendas mais fácil de usar do mercado. No VendaFácil, você começa a vender em menos de 10 minutos. Sem treinamentos complexos.',
};

export default function PDVFacilPage() {
  return (
    <SEOTemplate
      title="PDV Fácil: Para quem não tem tempo a perder"
      subtitle="A simplicidade que sua loja precisa para faturar mais todos os dias."
      content={
        <div className="space-y-10">
          <section>
            <h2>Por que escolher um PDV fácil?</h2>
            <p>Sistemas complexos afastam funcionários e travam a venda. Nosso <strong>PDV fácil</strong> foi desenhado para ser operado por qualquer pessoa.</p>
          </section>
        </div>
      }
    />
  );
}
