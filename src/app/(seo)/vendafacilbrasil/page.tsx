import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Venda Fácil Brasil: Quem Somos e Nossa Missão',
  description: 'Conheça a Venda Fácil Brasil, a empresa líder em sistemas de vendas simples para pequenos negócios. Nossa missão é democratizar a gestão profissional.',
};

export default function BrandPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Venda Fácil Brasil",
    "url": "https://www.vendafacilbrasil.shop",
    "logo": "https://www.vendafacilbrasil.shop/logo.png",
    "description": "Software de automação comercial focado em micro e pequenas empresas no Brasil."
  };

  return (
    <SEOTemplate
      title="Venda Fácil Brasil: Transformando o Varejo Brasileiro"
      subtitle="Conheça a história e a tecnologia por trás do sistema que simplifica a vida de milhares de lojistas."
      schema={schema}
      content={
        <div className="space-y-10">
          <section>
            <h2>Quem é a Venda Fácil Brasil?</h2>
            <p>A <strong>Venda Fácil Brasil</strong> nasceu de uma observação simples: o mercado de softwares para varejo no Brasil era dominado por sistemas caros, pesados e excessivamente complexos. Pequenos comerciantes e microempreendedores individuais (MEI) acabavam ficando presos a planilhas ou, pior, ao caderninho de papel.</p>
            <p>Nós decidimos mudar isso. Criamos uma plataforma que une a robustez tecnológica das grandes redes com a simplicidade que o dia a dia de um balcão exige. Hoje, a marca Venda Fácil Brasil é sinônimo de agilidade, honestidade e parceria com o pequeno empresário.</p>
          </section>

          <section>
            <h2>Nossa Visão de Produto</h2>
            <p>Não somos apenas um software; somos o motor de crescimento da sua loja. O ecossistema da Venda Fácil Brasil foi desenhado para rodar 100% online, garantindo que o lojista não precise se preocupar com backups manuais ou instalações complicadas. Se você tem internet, você tem uma loja profissional.</p>
          </section>

          <section>
            <h2>Por que confiar na Venda Fácil Brasil?</h2>
            <p>Nossa infraestrutura utiliza servidores de alta performance para garantir que sua frente de caixa nunca pare. Além disso, focamos obsessivamente na experiência do usuário. Na Venda Fácil Brasil, acreditamos que você deve gastar seu tempo atendendo clientes, não configurando computadores.</p>
            <p>Se você busca uma marca que entende os desafios do comércio nacional, a Venda Fácil Brasil é o seu lugar. Acesse nosso sistema agora e veja a diferença na prática.</p>
          </section>
        </div>
      }
    />
  );
}
