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
            <h2>A anatomia de um sistema PDV moderno</h2>
            <p>
              Um <strong>sistema PDV</strong> (Ponto de Venda) é o coração pulsante de qualquer comércio. Ele é o ponto de contato final com o cliente e a fonte primária de todos os seus dados financeiros. O VendaFácil foi construído para ser esse núcleo centralizador, eliminando a necessidade de várias planilhas ou softwares isolados que não conversam entre si.
            </p>
          </section>

          <section>
            <h2>Os três pilares da gestão com o VendaFácil</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-white p-6 rounded-xl border">
                <h3>Vendas</h3>
                <p className="text-sm">Registro rápido de transações, múltiplos meios de pagamento e emissão de recibos profissionais.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border">
                <h3>Estoque</h3>
                <p className="text-sm">Controle de entradas e saídas automático, gestão de CMV e alertas de estoque crítico em tempo real.</p>
              </div>
              <div className="bg-white p-6 rounded-xl border">
                <h3>Caixa</h3>
                <p className="text-sm">Monitoramento rigoroso de turnos, sangrias, suprimentos e fechamento de valores detalhado.</p>
              </div>
            </div>
          </section>

          <section>
            <h2>Otimizado para o mercado brasileiro</h2>
            <p>
              Desenvolvemos o VendaFácil entendendo as particularidades do comércio nacional. Nossa plataforma suporta nativamente as formas de pagamento preferidas do brasileiro, como o PIX e o parcelamento no cartão, facilitando a vida do seu operador de caixa e garantindo que o relatório financeiro reflita a realidade do seu extrato bancário.
            </p>
          </section>

          <section>
            <h2>Suporte que entende sua dor</h2>
            <p>
              Sabemos que dúvidas podem surgir. Por isso, oferecemos um suporte técnico humanizado e eficiente. Nossa equipe está pronta para ajudar você a configurar seus primeiros produtos e tirar o máximo proveito das ferramentas de inteligência que o sistema oferece.
            </p>
          </section>

          <section>
            <h2>Comece sua jornada de organização agora</h2>
            <p>
              Milhares de lojistas já abandonaram o papel e as planilhas manuais para usar o sistema PDV do VendaFácil. Junte-se a eles e descubra como a tecnologia certa pode trazer paz para a sua rotina administrativa e clareza para os seus lucros.
            </p>
          </section>
        </div>
      }
    />
  );
}
