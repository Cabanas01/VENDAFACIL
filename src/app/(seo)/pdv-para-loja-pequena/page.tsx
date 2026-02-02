import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para Loja Pequena: Gestão de Roupas, Acessórios e Mais | VendaFácil',
  description: 'O melhor sistema de vendas para lojas pequenas. Ideal para vestuário, eletrônicos e presentes. Controle vendas e clientes com facilidade.',
};

export default function PDVParaLojaPequenaPage() {
  return (
    <SEOTemplate
      title="PDV Online para Lojas Pequenas e Boutiques"
      subtitle="Dê um toque de profissionalismo à sua loja com gestão moderna e eficiente."
      content={
        <div className="space-y-10">
          <section>
            <h2>Modernize sua loja pequena</h2>
            <p>
              Ter uma <strong>loja pequena</strong> não significa que você deve ter uma gestão amadora. Boutiques de roupas, lojas de acessórios ou eletrônicos precisam de organização para prosperar. O VendaFácil traz para o seu negócio a mesma tecnologia usada por grandes redes varejistas, mas com uma simplicidade pensada para quem opera com equipe reduzida.
            </p>
          </section>

          <section>
            <h2>Foco na experiência do cliente</h2>
            <p>
              No varejo de moda ou presentes, o atendimento é tudo. Não quebre o encantamento da venda com um processo de pagamento lento ou burocrático. Com nosso PDV, você finaliza a venda no balcão de forma elegante e envia o comprovante por e-mail ou WhatsApp, reforçando a imagem moderna da sua marca.
            </p>
          </section>

          <section>
            <h2>Recursos para varejo de balcão</h2>
            <ul>
              <li><strong>Controle de Estoque Visual:</strong> Saiba exatamente quantas unidades de cada produto você ainda tem sem precisar ir ao estoque.</li>
              <li><strong>Histórico de Compras por Cliente:</strong> Saiba o que seus clientes mais gostam e ofereça produtos complementares na próxima visita.</li>
              <li><strong>Gestão de Promoções:</strong> Aplique descontos rápidos diretamente na tela de venda de forma controlada.</li>
              <li><strong>Relatórios de Performance:</strong> Entenda quais marcas ou tipos de produtos são os verdadeiros motores do seu lucro.</li>
            </ul>
          </section>

          <section>
            <h2>Por que o VendaFácil é a melhor escolha?</h2>
            <p>
              Diferente de sistemas que exigem contratos longos, o VendaFácil oferece liberdade. Nossa plataforma é intuitiva, barata e não exige aparelhos caros. Você pode usar o notebook que já tem na loja ou até um tablet, economizando espaço no balcão e dinheiro no seu bolso.
            </p>
          </section>
        </div>
      }
    />
  );
}
