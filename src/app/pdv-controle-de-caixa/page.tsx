import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Controle de Caixa PDV: Evite Furos no seu Financeiro | VendaFácil',
  description: 'Faça a gestão do seu fluxo de caixa com o VendaFácil. Abertura, fechamento e monitoramento de entradas em tempo real para seu PDV.',
};

export default function PDVControleCaixaPage() {
  return (
    <SEOTemplate
      title="Controle de Caixa Profissional para seu PDV"
      subtitle="Elimine as diferenças de caixa e tenha um fluxo financeiro impecável."
      content={
        <div className="space-y-10">
          <section>
            <h2>O que é a gestão de fluxo de caixa no PDV?</h2>
            <p>
              O <strong>controle de caixa</strong> é o processo de registrar todas as entradas e saídas de dinheiro físico e digital durante um turno de trabalho. Muitos lojistas sofrem com o famoso "caixa que não bate". O VendaFácil foi projetado para eliminar esse problema através de um fluxo guiado de abertura e fechamento de turno.
            </p>
          </section>

          <section>
            <h2>Como funciona o controle de caixa no VendaFácil</h2>
            <p>
              Nossa metodologia é simples e eficaz:
            </p>
            <ol>
              <li><strong>Abertura de Turno:</strong> O operador informa o valor inicial (fundo de troco).</li>
              <li><strong>Registro de Movimentações:</strong> Todas as vendas e retiradas (sangrias) são computadas automaticamente.</li>
              <li><strong>Fechamento Cego:</strong> O sistema calcula o valor esperado baseado nas operações, permitindo que o gestor compare com o valor físico contado.</li>
            </ol>
          </section>

          <section>
            <h2>Segurança e Transparência</h2>
            <p>
              Ter um sistema de controle de caixa traz segurança para o dono e para o funcionário. Como cada transação é registrada com data e hora, qualquer divergência pode ser auditada rapidamente. Isso cria um ambiente de trabalho mais profissional e reduz drasticamente as perdas financeiras por desatenção ou má fé.
            </p>
            <p>
              Além das vendas, você pode registrar entradas diversas ou saídas para pagamentos rápidos (como um frete ou reposição urgente), mantendo o saldo do caixa sempre atualizado em relação ao que está na gaveta.
            </p>
          </section>

          <section>
            <h2>A importância da conciliação diária</h2>
            <p>
              Fazer o controle de caixa diariamente permite identificar problemas no momento em que acontecem. Esperar o final do mês para conferir as contas é um erro fatal para pequenos negócios. Com o VendaFácil, essa tarefa leva menos de 5 minutos, garantindo que você durma tranquilo sabendo que seu financeiro está em ordem.
            </p>
          </section>
        </div>
      }
    />
  );
}
