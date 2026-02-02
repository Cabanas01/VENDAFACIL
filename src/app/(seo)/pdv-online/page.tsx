import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV Online: Sistema de Frente de Caixa Web | VendaFácil',
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
            <p>
              Um PDV online, ou Ponto de Venda baseado na nuvem, é uma ferramenta essencial para qualquer comerciante moderno. Diferente dos sistemas antigos, o <strong>PDV online do VendaFácil</strong> funciona inteiramente no seu navegador.
            </p>
          </section>

          <section>
            <h2>Vantagens de utilizar um sistema de vendas web</h2>
            <ul>
              <li><strong>Acesso em tempo real:</strong> Veja suas vendas de onde você estiver.</li>
              <li><strong>Segurança de dados:</strong> Suas informações são salvas automaticamente na nuvem.</li>
              <li><strong>Custo reduzido:</strong> Não exige investimentos em hardware pesado.</li>
              <li><strong>Atualizações automáticas:</strong> Você sempre utiliza a versão mais recente.</li>
            </ul>
          </section>

          <section>
            <h2>Por que o VendaFácil é o sistema PDV online ideal?</h2>
            <p>
              Desenvolvemos o VendaFácil pensando na agilidade do dia a dia. Nossa plataforma foca no que importa: <strong>vender rápido</strong>. Com o leitor de código de barras integrado e a busca inteligente, você finaliza uma transação em segundos.
            </p>
          </section>
        </div>
      }
    />
  );
}
