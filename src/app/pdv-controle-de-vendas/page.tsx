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
            <h2>A importância do rigor no controle de vendas</h2>
            <p>
              Sem um <strong>controle de vendas</strong> rigoroso, seu negócio está navegando no escuro. Você precisa saber não apenas quanto vendeu, mas como vendeu. O VendaFácil separa automaticamente suas entradas por tipo de pagamento: Dinheiro, Cartão ou PIX. Isso facilita a conciliação bancária no final do dia e evita surpresas no extrato.
            </p>
          </section>

          <section>
            <h2>Funcionalidades do VendaFácil para gestão de faturamento</h2>
            <p>
              Nosso sistema oferece uma visão 360º da sua operação comercial:
            </p>
            <ul>
              <li><strong>Histórico Completo:</strong> Acesse qualquer venda realizada no passado, veja os itens vendidos e o horário exato.</li>
              <li><strong>Ticket Médio:</strong> Entenda quanto cada cliente gasta em média na sua loja e crie estratégias para aumentar esse valor.</li>
              <li><strong>Produtos Estrela:</strong> Identifique rapidamente quais itens representam a maior parte do seu faturamento.</li>
              <li><strong>Cancelamentos Rastreados:</strong> Tenha segurança contra fraudes monitorando qualquer estorno ou cancelamento de venda.</li>
            </ul>
          </section>

          <section>
            <h2>Relatórios que facilitam a tomada de decisão</h2>
            <p>
              Transformamos dados brutos em informações úteis. Em vez de olhar para uma lista de números, você recebe gráficos intuitivos que mostram a tendência de crescimento do seu negócio. Se as vendas caem em um determinado dia da semana, o VendaFácil ajuda você a visualizar esse padrão para que você possa criar promoções específicas para esses períodos.
            </p>
          </section>

          <section>
            <h2>Simplifique seu fechamento de mês</h2>
            <p>
              No final do mês, exportar seus dados para a contabilidade ou para análise interna é um processo de segundos. Chega de somar canhotos de cartão ou notas fiscais perdidas. Com o VendaFácil, seu controle de vendas é digital, preciso e inquestionável.
            </p>
          </section>
        </div>
      }
    />
  );
}
