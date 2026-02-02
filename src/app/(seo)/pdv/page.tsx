import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV: O Guia Definitivo sobre Ponto de Venda Online | VendaFácil',
  description: 'O que é PDV? Como funciona um sistema de ponto de venda? Descubra como o PDV online pode transformar seu pequeno negócio com automação e controle total.',
};

export default function PillarPDVPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VendaFácil Brasil",
    "operatingSystem": "Web",
    "applicationCategory": "FinanceApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "BRL"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1250"
    }
  };

  return (
    <SEOTemplate
      title="PDV: O Ponto de Venda do Futuro para sua Loja"
      subtitle="Domine o conceito de PDV e descubra como a tecnologia certa pode dobrar sua eficiência operacional."
      schema={schema}
      content={
        <div className="space-y-12">
          <section>
            <h2>O que é PDV (Ponto de Venda)?</h2>
            <p>
              A sigla <strong>PDV</strong> significa <strong>Ponto de Venda</strong>. No sentido mais amplo, é o local onde uma transação comercial é concluída. Historicamente, o PDV era apenas o balcão da loja onde ficava a caixa registradora. Em 2024, o PDV evoluiu para ser um ecossistema completo de gestão.
            </p>
            <p>
              Um sistema de PDV moderno não apenas "passa as compras", mas integra o <strong>controle de estoque</strong>, a gestão de clientes, o fluxo de caixa e a inteligência de dados em uma única interface.
            </p>
          </section>

          <section className="bg-slate-100 p-8 rounded-3xl">
            <h3>PDV Online vs. PDV Tradicional</h3>
            <p>
              A grande revolução dos últimos anos foi a migração do software local para a nuvem. Entenda a diferença:
            </p>
            <ul>
              <li><strong>PDV Tradicional:</strong> Exige instalação em computadores caros, backups manuais e manutenção física.</li>
              <li><strong>PDV Online (Cloud):</strong> Funciona no navegador. Não exige instalação, os dados são salvos em tempo real na nuvem e você pode vender até pelo celular.</li>
            </ul>
          </section>

          <section>
            <h2>Por que pequenos negócios precisam de um sistema de PDV?</h2>
            <p>
              Muitos microempreendedores (MEI) ainda utilizam o caderninho ou planilhas de Excel. Veja por que profissionalizar:
            </p>
            <ol>
              <li><strong>Agilidade no Atendimento:</strong> O tempo de fila diminui drasticamente com buscas rápidas.</li>
              <li><strong>Controle de CMV:</strong> O sistema calcula automaticamente sua margem de lucro real.</li>
              <li><strong>Gestão de Estoque:</strong> Cada item vendido é baixado do sistema instantaneamente.</li>
              <li><strong>Fechamento de Caixa:</strong> Monitoramento de entradas por dinheiro, cartão e PIX.</li>
            </ol>
          </section>
        </div>
      }
    />
  );
}
