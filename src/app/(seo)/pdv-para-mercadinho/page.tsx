import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para Mercadinho e Mercearia: Rapidez no Balcão | VendaFácil',
  description: 'Sistema PDV ideal para mercadinhos, mercearias e empórios. Controle de estoque por código de barras e vendas rápidas para evitar filas.',
};

export default function PDVParaMercadinhoPage() {
  return (
    <SEOTemplate
      title="Sistema PDV para Mercadinhos e Mercearias"
      subtitle="Agilize o atendimento e tenha controle total do seu estoque de produtos."
      content={
        <div className="space-y-10">
          <section>
            <h2>A rotina de um mercadinho exige agilidade</h2>
            <p>
              Em uma mercearia ou mercadinho de bairro, o fluxo de clientes pode ser intenso em horários de pico. Ter um <strong>PDV para mercadinho</strong> que suporte leitura rápida de código de barras é fundamental para não deixar o cliente esperando. O VendaFácil foi otimizado para processar itens rapidamente, garantindo um checkout fluido.
            </p>
          </section>

          <section>
            <h2>Gestão de milhares de itens com facilidade</h2>
            <p>
              Mercadinhos possuem uma grande variedade de SKUs (itens). Controlar isso manualmente é impossível. Com nosso sistema, você pode:
            </p>
            <ul>
              <li><strong>Leitor de Código de Barras:</strong> Adicione produtos ao carrinho apenas bipando a embalagem.</li>
              <li><strong>Categorização Inteligente:</strong> Separe bebidas, hortifruti, limpeza e mercearia para relatórios mais precisos.</li>
              <li><strong>Inventário Simplificado:</strong> Atualize seu estoque rapidamente e identifique produtos com vencimento próximo ou baixo giro.</li>
              <li><strong>Controle de Precificação:</strong> Ajuste preços de forma global e mantenha sua margem de lucro sempre protegida contra a inflação.</li>
            </ul>
          </section>

          <section>
            <h2>Confiança no fechamento de caixa</h2>
            <p>
              Para mercadinhos que possuem funcionários operando o caixa, o VendaFácil oferece um sistema de auditoria robusto. Saiba exatamente quanto deveria ter em caixa ao final do dia e minimize perdas financeiras. A transparência do sistema protege tanto o proprietário quanto o colaborador honesto.
            </p>
          </section>

          <section>
            <h2>Tecnologia em nuvem para o comércio local</h2>
            <p>
              Não sofra mais com computadores antigos que travam e fazem você perder dados. Como o VendaFácil é um sistema em nuvem, se o seu computador der problema, basta abrir o navegador em outro dispositivo e continuar vendendo exatamente de onde parou. Seu mercadinho não pode parar!
            </p>
          </section>
        </div>
      }
    />
  );
}
