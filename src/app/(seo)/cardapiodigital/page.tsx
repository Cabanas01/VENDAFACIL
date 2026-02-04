import { Metadata } from 'next';
import { SEOTemplate } from '@/components/seo/seo-template';

/**
 * @fileOverview Página de destino para a rota /cardapiodigital.
 * Resolve o erro 404 e fornece conteúdo informativo sobre a funcionalidade de QR Code.
 */

export const metadata: Metadata = {
  title: 'Cardápio Digital QR Code: Peça na Mesa sem Garçom | VendaFácil',
  description: 'Aumente o faturamento do seu restaurante com o cardápio digital via QR Code. Pedidos rápidos direto para a cozinha e bar. Simples e ágil.',
};

export default function CardapioDigitalLandingPage() {
  return (
    <SEOTemplate
      title="Cardápio Digital QR Code: A Revolução na sua Mesa"
      subtitle="Reduza custos com equipe e aumente a velocidade do atendimento com autoatendimento via celular."
      content={
        <div className="space-y-10">
          <section>
            <h2>O que é o Cardápio Digital QR Code?</h2>
            <p>
              O <strong>cardápio digital</strong> é uma solução tecnológica que substitui o cardápio físico de papel por uma versão interativa acessível via smartphone. O cliente simplesmente aponta a câmera do celular para um código QR na mesa e tem acesso instantâneo a fotos, preços e descrições dos pratos.
            </p>
          </section>

          <section className="bg-cyan-50 p-8 rounded-3xl border border-cyan-100">
            <h3 className="text-cyan-900">Vantagens para seu Estabelecimento</h3>
            <ul className="list-disc pl-5 space-y-2 text-cyan-800 font-medium">
              <li><strong>Zero Erro de Pedido:</strong> O próprio cliente seleciona o que deseja, eliminando falhas de anotação.</li>
              <li><strong>Economia com Equipe:</strong> Sua equipe foca na hospitalidade e entrega, não apenas em "tirar pedido".</li>
              <li><strong>Atualização em Tempo Real:</strong> Mudou o preço ou acabou um item? Atualize no painel e mude instantaneamente na mesa.</li>
              <li><strong>Ticket Médio Elevado:</strong> Fotos atraentes e sugestões automáticas estimulam a compra de sobremesas e bebidas.</li>
            </ul>
          </section>

          <section>
            <h2>Integração Total com Produção</h2>
            <p>
              Diferente de catálogos simples de PDF, o <strong>cardápio digital do VendaFácil</strong> é um sistema vivo. Quando o cliente confirma o pedido, os itens são disparados automaticamente para:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
              <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                <h4 className="font-black uppercase text-[10px] text-orange-600 tracking-widest mb-2">Cozinha (KDS)</h4>
                <p className="text-xs font-bold text-orange-800">Pratos e guarnições aparecem no monitor de preparo instantaneamente.</p>
              </div>
              <div className="p-6 bg-cyan-50 rounded-2xl border border-cyan-100">
                <h4 className="font-black uppercase text-[10px] text-cyan-600 tracking-widest mb-2">Bar (BDS)</h4>
                <p className="text-xs font-bold text-cyan-800">Bebidas e drinks são listados para o barman sem necessidade de gritos ou papel.</p>
              </div>
            </div>
          </section>

          <section>
            <h2>Como ativar na sua loja?</h2>
            <p>O processo é extremamente simples e não exige equipamentos caros:</p>
            <ol>
              <li>Cadastre seus produtos e defina o destino (Cozinha ou Bar).</li>
              <li>Gere e imprima os adesivos de QR Code para as mesas.</li>
              <li>O cliente lê o código, se identifica e faz o pedido.</li>
              <li>Você monitora tudo pelo Painel de Comandas e recebe o pagamento no caixa.</li>
            </ol>
          </section>
        </div>
      }
    />
  );
}
