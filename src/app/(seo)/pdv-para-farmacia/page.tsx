import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para Farmácia e Drogaria: Controle de Medicamentos | VendaFácil',
  description: 'Sistema PDV ideal para pequenas farmácias e drogarias. Controle de estoque rigoroso, busca por código de barras e gestão de perfumaria.',
};

export default function PDVFarmaciaPage() {
  return (
    <SEOTemplate
      title="Sistema PDV para Farmácias e Drogarias"
      subtitle="Precisão no estoque e rapidez no atendimento para o seu balcão farmacêutico."
      content={
        <div className="space-y-10">
          <section>
            <h2>Complexidade de estoque simplificada</h2>
            <p>
              Farmácias lidam com milhares de itens e variações milimétricas de nomes e dosagens. Um <strong>PDV para farmácia</strong> deve ter uma busca poderosa e suporte total a leitores de código de barras. O VendaFácil permite que você localize o medicamento exato em milissegundos, garantindo a segurança da venda e a satisfação do cliente.
            </p>
          </section>

          <section>
            <h2>Diferenciais para drogarias independentes</h2>
            <ul>
              <li><strong>Leitura de Código EAN:</strong> Adicione produtos bípando a caixa do medicamento, evitando erros de digitação.</li>
              <li><strong>Gestão de Higiene e Perfumaria:</strong> Controle o estoque de produtos de conveniência que possuem alta margem de lucro.</li>
              <li><strong>Alertas de Estoque Mínimo:</strong> Receba notificações antes que medicamentos essenciais faltem na prateleira.</li>
              <li><strong>Relatórios de Vencimento:</strong> Identifique produtos próximos à data de validade e tome ações rápidas de venda.</li>
            </ul>
          </section>

          <section>
            <h2>Atendimento que gera confiança</h2>
            <p>
              O cliente da farmácia muitas vezes está em um momento de urgência ou fragilidade. Um processo de venda travado ou lento passa uma imagem de desorganização. Com nosso PDV online, o checkout é silencioso e eficiente, permitindo que o farmacêutico dedique mais tempo à orientação do cliente do que ao computador.
            </p>
          </section>

          <section>
            <h2>Gestão multi-unidade</h2>
            <p>
              Se você possui duas ou mais drogarias, o VendaFácil permite gerir todos os estoques de forma centralizada. Compare o faturamento das unidades, transfira produtos entre lojas baseando-se na demanda e tenha uma visão macro da saúde do seu negócio de qualquer lugar do mundo.
            </p>
          </section>
        </div>
      }
    />
  );
}
