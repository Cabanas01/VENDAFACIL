import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV para MEI: Sistema de Vendas Barato e Eficiente | VendaFácil',
  description: 'O melhor sistema PDV para MEI. Controle suas vendas e estoque de forma profissional sem gastar muito. Simples, rápido e 100% online.',
};

export default function PDVParaMeiPage() {
  return (
    <SEOTemplate
      title="PDV para MEI: Profissionalize seu Micro-Negócio"
      subtitle="Saia do caderninho e use o sistema de vendas favorito dos Microempreendedores Individuais."
      content={
        <div className="space-y-10">
          <section>
            <h2>Por que o MEI precisa de um sistema PDV?</h2>
            <p>
              Um <strong>PDV para MEI</strong> como o VendaFácil permite que você organize seu negócio em poucos minutos, garantindo que você tenha os dados necessários para sua gestão e declaração anual.
            </p>
          </section>

          <section>
            <h2>Funcionalidades pensadas para o Microempreendedor</h2>
            <ul>
              <li><strong>Baixo Custo:</strong> Planos que cabem no seu orçamento.</li>
              <li><strong>Emissão de Recibos:</strong> Passe confiança para seus clientes.</li>
              <li><strong>Cadastro de Clientes:</strong> Crie uma base de contatos para vender mais.</li>
              <li><strong>Mobilidade Total:</strong> Use no computador ou no celular.</li>
            </ul>
          </section>
        </div>
      }
    />
  );
}
