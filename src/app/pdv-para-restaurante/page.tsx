import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para Restaurante e Lanchonete: Gestão de Pedidos | VendaFácil',
  description: 'O melhor sistema PDV para restaurantes, bares e lanchonetes. Organize pedidos, controle o caixa e gerencie seu estoque de insumos com facilidade.',
};

export default function PDVRestaurantePage() {
  return (
    <SEOTemplate
      title="Sistema PDV para Restaurantes e Gastronomia"
      subtitle="Gestão ágil de pedidos e controle financeiro rigoroso para o seu negócio de alimentação."
      content={
        <div className="space-y-10">
          <section>
            <h2>Agilidade da cozinha ao caixa</h2>
            <p>
              No setor de alimentação, a comunicação entre o atendimento e a produção é vital. Um <strong>PDV para restaurante</strong> ou lanchonete deve simplificar o registro do pedido para que o operador de caixa não perca tempo com cliques desnecessários. O VendaFácil oferece uma interface limpa que agiliza o checkout, permitindo que você foque na qualidade da comida.
            </p>
          </section>

          <section>
            <h2>Funcionalidades para o setor de alimentação</h2>
            <ul>
              <li><strong>Personalização de Pedidos:</strong> Registre observações importantes ("sem cebola", "bem passado") diretamente no sistema.</li>
              <li><strong>Divisão de Pagamentos:</strong> Facilite a vida dos clientes permitindo dividir a conta entre vários cartões e dinheiro.</li>
              <li><strong>Controle de Insumos:</strong> Gerencie o estoque de bebidas, embalagens e ingredientes para nunca faltar nada no meio do serviço.</li>
              <li><strong>Histórico de Vendas por Período:</strong> Saiba quais pratos saem mais no almoço e quais são os favoritos do jantar.</li>
            </ul>
          </section>

          <section>
            <h2>Controle financeiro contra surpresas</h2>
            <p>
              O setor de restaurantes sofre muito com pequenas perdas diárias. O rigoroso sistema de <strong>fechamento de caixa</strong> do VendaFácil garante que cada bebida aberta e cada prato servido tenha sido devidamente computado. A transparência do sistema inibe erros e fraudes, protegendo sua margem de lucro.
            </p>
          </section>

          <section>
            <h2>Otimizado para Delivery e Balcão</h2>
            <p>
              Seja você um food truck, uma lanchonete de bairro ou um restaurante self-service, nosso PDV online se adapta à sua realidade. Por ser 100% web, você pode registrar pedidos de um tablet no meio do salão ou do notebook fixo no balcão, mantendo tudo sincronizado automaticamente.
            </p>
          </section>
        </div>
      }
    />
  );
}
