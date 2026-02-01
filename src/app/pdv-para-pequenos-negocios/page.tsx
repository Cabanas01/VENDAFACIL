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
            <h2>O desafio de gerir um pequeno negócio</h2>
            <p>
              Ter um <strong>PDV para pequenos negócios</strong> não é luxo, é sobrevivência. O VendaFácil organiza sua bagunça administrativa, trazendo clareza sobre suas margens de lucro.
            </p>
          </section>

          <section>
            <h2>Organização que gera lucro</h2>
            <ul>
              <li><strong>Calcular o CMV:</strong> Saiba o custo de cada mercadoria.</li>
              <li><strong>Evitar Perdas:</strong> Controle rígido de estoque e caixa.</li>
              <li><strong>Prever Reposições:</strong> Receba alertas de estoque baixo.</li>
            </ul>
          </section>
        </div>
      }
    />
  );
}
