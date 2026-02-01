import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV Simples: Sistema de Vendas Descomplicado | VendaFácil',
  description: 'Procurando um PDV simples e intuitivo? O VendaFácil oferece controle de vendas e estoque sem burocracia para quem quer agilidade no balcão.',
};

export default function PDVSimplesPage() {
  return (
    <SEOTemplate
      title="PDV Simples: Gestão sem Complicação"
      subtitle="A maneira mais fácil de registrar vendas e controlar seu estoque sem perder tempo."
      content={
        <div className="space-y-10">
          <section>
            <h2>Por que escolher um PDV simples?</h2>
            <p>
              No dia a dia de um pequeno negócio, cada segundo conta. Um <strong>PDV simples</strong> como o VendaFácil foi desenhado para ser "clicar e vender". Nossa filosofia é remover a barreira tecnológica entre você e seu cliente.
            </p>
          </section>

          <section>
            <h2>Recursos essenciais para um controle de vendas prático</h2>
            <ul>
              <li><strong>Interface Limpa:</strong> Sem botões inúteis que confundem o operador.</li>
              <li><strong>Busca Rápida:</strong> Localize produtos instantaneamente.</li>
              <li><strong>Fechamento de Caixa:</strong> Saiba exatamente quanto entrou em cada meio de pagamento.</li>
              <li><strong>Gestão de Clientes:</strong> Saiba quem são seus melhores compradores.</li>
            </ul>
          </section>
        </div>
      }
    />
  );
}
