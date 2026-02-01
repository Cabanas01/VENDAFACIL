import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Sistema PDV: Gestão de Vendas, Estoque e Caixa | VendaFácil',
  description: 'Conheça o sistema PDV que está revolucionando o pequeno comércio. Gestão integrada de vendas, estoque e fluxo de caixa em uma só plataforma.',
};

export default function SistemaPDVPage() {
  return (
    <SEOTemplate
      title="Sistema PDV Completo para sua Gestão Comercial"
      subtitle="Integração total entre vendas, estoque e financeiro em um único lugar."
      content={
        <div className="space-y-10">
          <section>
            <h2>O coração do seu comércio</h2>
            <p>
              Um <strong>sistema PDV</strong> é o ponto de contato final com o cliente. O VendaFácil centraliza sua operação, eliminando planilhas manuais.
            </p>
          </section>

          <section>
            <h2>Os três pilares da gestão</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-white p-6 rounded-xl border">
                <h3>Vendas</h3>
                <p className="text-sm">Registro rápido e recibos profissionais.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border">
                <h3>Estoque</h3>
                <p className="text-sm">Baixa automática e alertas críticos.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border">
                <h3>Caixa</h3>
                <p className="text-sm">Fechamento detalhado e auditoria.</p>
              </div>
            </div>
          </section>
        </div>
      }
    />
  );
}
