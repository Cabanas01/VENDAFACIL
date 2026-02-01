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
              No dia a dia de um pequeno negócio, cada segundo conta. Você não pode perder tempo tentando entender tabelas complexas ou sistemas que travam. Um <strong>PDV simples</strong> como o VendaFácil foi desenhado para ser "clicar e vender". Nossa filosofia é remover a barreira tecnológica entre você e seu cliente.
            </p>
          </section>

          <section>
            <h2>Recursos essenciais para um controle de vendas prático</h2>
            <p>
              Muitas ferramentas pecam pelo excesso. No VendaFácil, focamos naquilo que realmente faz a diferença na sua operação:
            </p>
            <ul>
              <li><strong>Interface Limpa:</strong> Sem anúncios ou botões inúteis que confundem o operador.</li>
              <li><strong>Busca Rápida:</strong> Localize produtos pelo nome, categoria ou código de barras instantaneamente.</li>
              <li><strong>Fechamento de Caixa:</strong> Saiba exatamente quanto entrou em dinheiro, PIX ou cartão sem precisar de calculadoras.</li>
              <li><strong>Gestão de Clientes:</strong> Um cadastro básico para saber quem são seus melhores compradores.</li>
            </ul>
          </section>

          <section>
            <h2>Ideal para quem está começando</h2>
            <p>
              Se você é MEI ou possui uma loja pequena e ainda usa caderno ou planilhas de Excel, o VendaFácil é o seu próximo passo. A simplicidade do nosso sistema permite uma transição suave do papel para o digital, dando um ar muito mais profissional para o seu negócio diante dos clientes.
            </p>
            <p>
              Ao utilizar um PDV simples, você diminui erros humanos de digitação e cálculos, garantindo que o valor cobrado e o estoque baixado estejam sempre corretos.
            </p>
          </section>

          <section>
            <h2>Experimente a facilidade do VendaFácil</h2>
            <p>
              Nosso sistema foi validado por centenas de lojistas que buscavam apenas uma coisa: agilidade. Não deixe que a tecnologia seja um problema para sua empresa. Torne sua gestão transparente e foque no que você faz de melhor: atender seus clientes e crescer suas vendas.
            </p>
          </section>
        </div>
      }
    />
  );
}
