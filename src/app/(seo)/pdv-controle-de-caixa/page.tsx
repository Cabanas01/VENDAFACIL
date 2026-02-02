import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'Controle de Caixa PDV: Evite Furos no seu Financeiro | VendaFácil',
  description: 'Faça a gestão do seu fluxo de caixa com o VendaFácil. Abertura, fechamento e monitoramento de entradas em tempo real para seu PDV.',
};

export default function PDVControleCaixaPage() {
  return (
    <SEOTemplate
      title="Controle de Caixa Profissional para seu PDV"
      subtitle="Elimine as diferenças de caixa e tenha um fluxo financeiro impecável."
      content={
        <div className="space-y-10">
          <section>
            <h2>Gestão de fluxo de caixa no PDV</h2>
            <p>
              O <strong>controle de caixa</strong> é o processo de registrar todas as entradas e saídas de dinheiro. O VendaFácil elimina diferenças através de um fluxo guiado de abertura e fechamento de turno.
            </p>
          </section>

          <section>
            <h2>Segurança e Transparência</h2>
            <p>
              Como cada transação é registrada com data e hora, qualquer divergência pode ser auditada rapidamente. Isso protege tanto o proprietário quanto o colaborador.
            </p>
          </section>
        </div>
      }
    />
  );
}
