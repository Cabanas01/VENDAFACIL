import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV ou Planilha: Qual a melhor escolha para sua loja? | VendaFácil',
  description: 'Ainda usa Excel para controlar vendas? Veja as vantagens de migrar para um sistema PDV profissional e como isso pode dobrar sua produtividade.',
};

export default function PDVvsPlanilhaPage() {
  return (
    <SEOTemplate
      title="PDV ou Planilha: Onde seu negócio deve estar?"
      subtitle="Entenda por que o controle manual está matando a sua lucratividade."
      content={
        <div className="space-y-10">
          <section>
            <h2>Os riscos da Planilha no Varejo</h2>
            <p>Planilhas não são automatizadas e aceitam erros. Um <strong>sistema PDV</strong> bloqueia falhas humanas e gera relatórios automáticos que o Excel não faz sozinho.</p>
          </section>
        </div>
      }
    />
  );
}
