import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Controle de Vendas PDV: Gestão Financeira Completa | VendaFácil',
  description: 'Domine seu faturamento com o controle de vendas do VendaFácil. Relatórios detalhados, histórico de transações e gestão de PDV eficiente.',
};

export default function PDVControleVendasPage() {
  return (
    <SEOTemplate
      title="Controle de Vendas Total no seu PDV"
      subtitle="Acompanhe cada centavo que entra na sua empresa com relatórios automáticos."
      content={
        <div className="space-y-10">
          <section>
            <h2>Rigor no controle de vendas</h2>
            <p>
              O VendaFácil separa automaticamente suas entradas por tipo de pagamento (Dinheiro, Cartão ou PIX), facilitando a conciliação bancária e evitando surpresas.
            </p>
          </section>

          <section>
            <h2>Funcionalidades do VendaFácil</h2>
            <ul>
              <li><strong>Histórico Completo:</strong> Acesse qualquer venda realizada no passado.</li>
              <li><strong>Ticket Médio:</strong> Entenda quanto cada cliente gasta.</li>
              <li><strong>Cancelamentos Rastreados:</strong> Tenha segurança contra fraudes.</li>
            </ul>
          </section>
        </div>
      }
    />
  );
}
