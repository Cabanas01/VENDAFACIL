import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV Online: Frente de Caixa Web e Gestão na Nuvem | VendaFácil',
  description: 'Conheça o melhor PDV online do Brasil. Sistema de frente de caixa 100% web, ideal para pequenos negócios controlarem vendas e estoque pelo navegador.',
};

export default function PDVOnlinePage() {
  return (
    <SEOTemplate
      title="O Melhor PDV Online para seu Negócio"
      subtitle="Simplifique sua frente de caixa com um sistema 100% web, rápido e seguro."
      content={
        <div className="space-y-10">
          <section>
            <h2>O que é um PDV Online?</h2>
            <p>Um PDV online é uma ferramenta essencial para qualquer comerciante moderno. Diferente dos sistemas antigos, o <strong>PDV online do VendaFácil</strong> funciona inteiramente no seu navegador. Isso significa que você pode realizar vendas de qualquer lugar.</p>
          </section>
          <section>
            <h2>Vantagens de utilizar um sistema de vendas web</h2>
            <ul>
              <li><strong>Acesso em tempo real:</strong> Veja suas vendas de onde você estiver.</li>
              <li><strong>Segurança:</strong> Dados salvos automaticamente na nuvem.</li>
              <li><strong>Custo reduzido:</strong> Sem investimento em hardware pesado.</li>
            </ul>
          </section>
        </div>
      }
    />
  );
}
