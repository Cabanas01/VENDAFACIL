import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para Pequenos Negócios: Cresça com Organização | VendaFácil',
  description: 'O sistema PDV perfeito para pequenos negócios. Controle financeiro, gestão de estoque e vendas em uma plataforma fácil de usar e barata.',
};

export default function PDVPequenosNegociosPage() {
  return (
    <SEOTemplate
      title="PDV Especializado para Pequenos Negócios"
      subtitle="Ferramentas profissionais de grandes empresas adaptadas para a sua realidade."
      content={
        <div className="space-y-10">
          <section>
            <h2>O desafio de gerir um pequeno negócio no Brasil</h2>
            <p>
              Sabemos que o dono de um pequeno negócio é, muitas vezes, o vendedor, o estoquista e o financeiro. Com tantas tarefas, é comum a gestão se perder. Ter um <strong>PDV para pequenos negócios</strong> não é luxo, é sobrevivência. O VendaFácil surge para organizar essa bagunça administrativa, trazendo clareza sobre suas margens de lucro.
            </p>
          </section>

          <section>
            <h2>Organização que gera lucro</h2>
            <p>
              Muitas vezes o dinheiro entra, mas você não sabe se teve lucro real no fim do mês. Nosso sistema ajuda você a:
            </p>
            <ul>
              <li><strong>Calcular o CMV:</strong> Saiba o custo de cada mercadoria vendida e sua margem real.</li>
              <li><strong>Evitar Furtos e Perdas:</strong> Com o controle rígido de estoque e fechamento de caixa, você tem total domínio sobre seus ativos físicos.</li>
              <li><strong>Prever Reposições:</strong> Receba alertas de estoque baixo antes que o produto acabe e você perca uma venda.</li>
            </ul>
          </section>

          <section>
            <h2>Escalabilidade e Crescimento</h2>
            <p>
              Mesmo sendo pequeno hoje, seu negócio tem potencial de crescimento. O VendaFácil acompanha sua jornada. Você pode começar sozinho e, conforme contratar funcionários, adicionar novos operadores ao sistema, controlando o que cada um pode ver ou editar.
            </p>
            <p>
              Nossa tecnologia em nuvem garante que, se você abrir uma segunda unidade, poderá gerir ambas de um único painel administrativo centralizado, comparando a performance entre elas em tempo real.
            </p>
          </section>

          <section>
            <h2>Um investimento com retorno garantido</h2>
            <p>
              Diferente de softwares caros que cobram fortunas por implantação, o VendaFácil é um SaaS (Software como Serviço) acessível. Você paga uma mensalidade pequena que se paga logo nos primeiros dias através da economia gerada pela organização e pela redução de desperdícios no estoque.
            </p>
          </section>
        </div>
      }
    />
  );
}
