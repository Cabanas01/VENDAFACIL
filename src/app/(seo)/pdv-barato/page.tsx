import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV Barato: O Sistema de Vendas com Melhor Custo-Benefício | VendaFácil',
  description: 'Buscando um PDV barato e profissional? O VendaFácil oferece planos que cabem no bolso do MEI e do pequeno empresário. Confira nossos preços.',
};

export default function PDVBaratoPage() {
  return (
    <SEOTemplate
      title="PDV Barato: Qualidade Profissional com Preço Justo"
      subtitle="Invista na sua loja sem comprometer o seu capital de giro."
      content={
        <div className="space-y-10">
          <section>
            <h2>O que define um PDV barato de verdade?</h2>
            <p>Não é apenas o preço baixo, mas o retorno que ele traz. Um <strong>PDV barato</strong> como o VendaFácil se paga nos primeiros dias de uso através da organização.</p>
          </section>
        </div>
      }
    />
  );
}
