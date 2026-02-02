import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Software PDV: O Melhor Sistema de Gestão de Vendas | VendaFácil',
  description: 'Buscando um software PDV robusto e confiável? O VendaFácil é o sistema de gestão de vendas líder para pequenos negócios em todo o Brasil.',
};

export default function SoftwarePDVPage() {
  return (
    <SEOTemplate
      title="Software PDV: Tecnologia de Ponta para sua Empresa"
      subtitle="Um sistema completo, estável e sempre disponível para garantir suas vendas."
      content={
        <div className="space-y-10">
          <section>
            <h2>Software PDV em 2024</h2>
            <p>
              Hoje, um <strong>software PDV</strong> de qualidade deve ser necessariamente baseado na nuvem. O VendaFácil representa a nova geração de softwares, garantindo estabilidade e rapidez.
            </p>
          </section>

          <section>
            <h2>Segurança de Nível Bancário</h2>
            <ul>
              <li><strong>Criptografia:</strong> Seus dados comerciais protegidos.</li>
              <li><strong>Backups Diários:</strong> Nunca perca seu histórico.</li>
              <li><strong>Controle de Acessos:</strong> Permissões granulares para sua equipe.</li>
            </ul>
          </section>
        </div>
      }
    />
  );
}
