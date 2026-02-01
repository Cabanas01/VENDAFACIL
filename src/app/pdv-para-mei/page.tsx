import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para MEI: Sistema de Vendas Barato e Eficiente | VendaFácil',
  description: 'O melhor sistema PDV para MEI. Controle suas vendas e estoque de forma profissional sem gastar muito. Simples, rápido e 100% online.',
};

export default function PDVParaMeiPage() {
  return (
    <SEOTemplate
      title="PDV para MEI: Profissionalize seu Micro-Negócio"
      subtitle="Saia do caderninho e use o sistema de vendas favorito dos Microempreendedores Individuais."
      content={
        <div className="space-y-10">
          <section>
            <h2>Por que o MEI precisa de um sistema PDV?</h2>
            <p>
              Ser um Microempreendedor Individual significa ser o motor de toda a operação. Muitas vezes, a gestão financeira acaba ficando de lado pela falta de tempo. Um <strong>PDV para MEI</strong> como o VendaFácil permite que você organize seu negócio em poucos minutos por dia, garantindo que você tenha os dados necessários para sua Declaração Anual (DASN-SIMEI).
            </p>
          </section>

          <section>
            <h2>Funcionalidades pensadas para o Microempreendedor</h2>
            <ul>
              <li><strong>Baixo Custo:</strong> Planos que cabem no orçamento do MEI, sem taxas de adesão abusivas.</li>
              <li><strong>Emissão de Recibos:</strong> Passe confiança para seus clientes entregando um comprovante de venda profissional.</li>
              <li><strong>Cadastro de Clientes:</strong> Crie uma base de contatos para enviar promoções via WhatsApp e fidelizar seu público.</li>
              <li><strong>Mobilidade Total:</strong> Use no seu computador de mesa ou leve seu PDV no celular para vendas externas.</li>
            </ul>
          </section>

          <section>
            <h2>Organização para crescer</h2>
            <p>
              O maior benefício de usar um sistema PDV sendo MEI é a preparação para o crescimento. Quando sua empresa começar a faturar mais e você precisar desenquadrar para Microempresa, seus dados estarão organizados e sua operação já terá processos profissionais estabelecidos.
            </p>
            <p>
              O controle de estoque do VendaFácil evita que você imobilize capital desnecessariamente em produtos que não giram, um erro comum que quebra muitos microempreendedores nos primeiros anos.
            </p>
          </section>

          <section>
            <h2>Simplicidade é a nossa regra</h2>
            <p>
              Você não precisa ser expert em computação para usar o VendaFácil. Nossa interface foi desenhada para ser autoexplicativa. Cadastre seu primeiro produto hoje e veja como é gratificante ter o controle total das suas vendas na palma da mão.
            </p>
          </section>
        </div>
      }
    />
  );
}
