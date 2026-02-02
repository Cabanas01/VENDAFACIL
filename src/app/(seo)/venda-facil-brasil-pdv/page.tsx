import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Venda Fácil Brasil PDV: A Solução Completa para sua Loja',
  description: 'O Venda Fácil Brasil PDV é o coração da sua operação comercial. Controle estoque, caixa e vendas com a marca líder em simplicidade no Brasil.',
};

export default function BrandPDVPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Venda Fácil Brasil PDV",
    "operatingSystem": "Web",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "BRL"
    }
  };

  return (
    <SEOTemplate
      title="Venda Fácil Brasil PDV: Potência e Simplicidade"
      subtitle="O ponto de venda que coloca o controle do seu negócio na palma da sua mão."
      schema={schema}
      content={
        <div className="space-y-10">
          <section>
            <h2>O que é o Venda Fácil Brasil PDV?</h2>
            <p>O <strong>Venda Fácil Brasil PDV</strong> é o software definitivo de frente de caixa desenhado para quem não quer perder tempo. Ele integra todas as funções vitais de um comércio em uma interface única e extremamente rápida. Com o selo de qualidade da Venda Fácil Brasil, você tem a certeza de um sistema que entende o fluxo de vendas real.</p>
          </section>

          <section className="bg-slate-50 p-8 rounded-3xl border">
            <h3>Principais Pilares do Nosso PDV</h3>
            <ul>
              <li><strong>Velocidade de Checkout:</strong> Registre itens via código de barras ou busca rápida em milissegundos.</li>
              <li><strong>Integração Financeira:</strong> Saiba exatamente quanto entrou em Dinheiro, PIX e Cartão no fim do dia.</li>
              <li><strong>Gestão de Inventário:</strong> Baixa automática de produtos para você nunca vender o que não tem.</li>
            </ul>
          </section>

          <section>
            <h2>Para quem indicamos o Venda Fácil Brasil PDV?</h2>
            <p>Seja você dono de um mercadinho, uma loja de roupas, uma padaria ou uma farmácia, o nosso PDV se adapta à sua necessidade. Ele foi construído para ser flexível o suficiente para diversos nichos, mas mantendo a simplicidade que é a marca registrada da Venda Fácil Brasil.</p>
            <p>Ao escolher o Venda Fácil Brasil PDV, você está investindo na profissionalização da sua marca. Deixe para trás o amadorismo e venha para a era digital com quem mais entende de pequenos negócios no país.</p>
          </section>
        </div>
      }
    />
  );
}
