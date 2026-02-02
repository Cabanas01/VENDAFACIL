import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para Padaria: Agilidade e Controle de Produção | VendaFácil',
  description: 'Procurando um sistema PDV para padaria? Controle vendas por peso, produtos de fabricação própria e evite filas no balcão com o VendaFácil.',
};

export default function PDVPadariaPage() {
  return (
    <SEOTemplate
      title="Sistema PDV Especializado para Padarias"
      subtitle="Transforme o atendimento da sua padaria com um sistema rápido e focado em alta rotatividade."
      content={
        <div className="space-y-10">
          <section>
            <h2>A dinâmica de uma padaria moderna</h2>
            <p>
              Padarias e panificadoras possuem um dos fluxos de atendimento mais intensos do varejo. O cliente quer o pão quente e o café de forma imediata. Um <strong>PDV para padaria</strong> precisa ser capaz de lidar com centenas de transações rápidas em poucos minutos, especialmente nos horários de pico pela manhã e no fim do dia.
            </p>
          </section>

          <section>
            <h2>Recursos essenciais para panificação</h2>
            <ul>
              <li><strong>Venda Rápida de Balcão:</strong> Atalhos para os itens mais vendidos (pão francês, leite, café) para finalizar vendas em segundos.</li>
              <li><strong>Gestão de Itens por Peso:</strong> Integração visual para controle de produtos pesados, essencial para frios e doces.</li>
              <li><strong>Controle de Produção Própria:</strong> Saiba exatamente quanto custa produzir cada fornada e ajuste seus preços para garantir rentabilidade.</li>
              <li><strong>Múltiplos Pontos de Venda:</strong> Sincronize o caixa da lanchonete com o caixa de pães em tempo real.</li>
            </ul>
          </section>

          <section>
            <h2>Reduza perdas e desperdícios</h2>
            <p>
              O grande inimigo do lucro em padarias é o desperdício de produtos perecíveis. Com o controle de estoque do VendaFácil, você identifica quais produtos estão sobrando e pode criar promoções de "hora do desconto" para queimar o estoque antes do vencimento, transformando prejuízo em faturamento.
            </p>
          </section>

          <section>
            <h2>Fidelize o cliente do bairro</h2>
            <p>
              O segredo do sucesso de uma padaria é a recorrência. Use nosso cadastro de clientes para criar um programa de fidelidade simples ou enviar mensagens via WhatsApp quando sair aquela fornada de pão de queijo quentinha. Tecnologia e proximidade andam juntas.
            </p>
          </section>
        </div>
      }
    />
  );
}
