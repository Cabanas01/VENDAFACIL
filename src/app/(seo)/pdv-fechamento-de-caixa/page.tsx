import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Fechamento de Caixa PDV: Relatórios e Auditoria de Turno | VendaFácil',
  description: 'Saiba como fazer um fechamento de caixa perfeito no seu PDV. Auditoria de valores, sangrias e conciliação bancária simples e rápida.',
};

export default function PDVFechamentoCaixaPage() {
  return (
    <SEOTemplate
      title="Fechamento de Caixa sem Diferenças e sem Estresse"
      subtitle="Tenha total transparência sobre o dinheiro que entra na sua loja."
      content={
        <div className="space-y-10">
          <section>
            <h2>O segredo do caixa que sempre bate</h2>
            <p>Um rigoroso <strong>fechamento de caixa</strong> inibe erros e fraudes. Com o VendaFácil, o processo é guiado e auditável.</p>
          </section>
        </div>
      }
    />
  );
}
