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
              Um PDV online, ou Ponto de Venda baseado na nuvem, é uma ferramenta essencial para qualquer comerciante moderno. Diferente dos sistemas antigos que exigiam instalações complexas e servidores locais, o <strong>PDV online do VendaFácil</strong> funciona inteiramente no seu navegador. Isso significa que você pode realizar vendas de qualquer lugar, seja do seu balcão, de um tablet no estoque ou até do celular em uma feira de rua.
            </p>
          </section>

          <section>
            <h2>Vantagens de utilizar um sistema de vendas web</h2>
            <ul>
              <li><strong>Acesso em tempo real:</strong> Veja suas vendas e o saldo do caixa de onde você estiver.</li>
              <li><strong>Segurança de dados:</strong> Suas informações são salvas automaticamente na nuvem, sem risco de perda por falhas no computador.</li>
              <li><strong>Custo reduzido:</strong> Não exige investimentos em infraestrutura cara ou licenciamento de softwares pesados.</li>
              <li><strong>Atualizações automáticas:</strong> Você sempre utiliza a versão mais recente e otimizada sem pagar nada a mais por isso.</li>
            </ul>
          </section>

          <section>
            <h2>Por que o VendaFácil é o sistema PDV online ideal?</h2>
            <p>
              Desenvolvemos o VendaFácil pensando na agilidade do dia a dia. Muitos sistemas disponíveis no mercado são lentos ou cheios de menus desnecessários. Nossa plataforma foca no que importa: <strong>vender rápido</strong>. Com o leitor de código de barras integrado e a busca inteligente de produtos, você finaliza uma transação em segundos, mantendo a fila do seu estabelecimento sempre em movimento.
            </p>
            <p>
              Além disso, nossa integração com relatórios financeiros permite que você entenda exatamente para onde está indo o dinheiro da sua empresa, identificando os produtos que mais dão lucro e aqueles que estão parados no estoque.
            </p>
          </section>

          <section>
            <h2>Como começar a usar seu Ponto de Venda hoje</h2>
            <p>
              Para começar a vender com o VendaFácil, o processo é extremamente simples. Basta criar sua conta, cadastrar seus produtos com preço de custo e venda, e abrir seu primeiro caixa. Nossa interface intuitiva garante que você e sua equipe não precisem de treinamentos longos — em 10 minutos, qualquer pessoa está pronta para operar o sistema profissionalmente.
            </p>
          </section>
        </div>
      }
    />
  );
}
