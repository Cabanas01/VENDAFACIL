import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

export const metadata: Metadata = {
  title: 'PDV Gratuito: Sistema de Vendas Grátis para Começar | VendaFácil',
  description: 'Procurando um PDV gratuito? Experimente o VendaFácil. Oferecemos um período de teste completo para você organizar suas vendas sem gastar nada no início.',
};

export default function PDVGratuitoPage() {
  return (
    <SEOTemplate
      title="PDV Gratuito: Comece a Vender Agora sem Custos"
      subtitle="A porta de entrada para a profissionalização da sua loja com custo zero."
      content={
        <div className="space-y-10">
          <section>
            <h2>PDV Gratuito vale a pena?</h2>
            <p>Para quem está começando, um <strong>PDV gratuito</strong> é a salvação. O VendaFácil permite que você teste todas as ferramentas premium gratuitamente, garantindo que o sistema se adapte ao seu negócio antes de qualquer investimento.</p>
          </section>
        </div>
      }
    />
  );
}
