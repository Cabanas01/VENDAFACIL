# 🗺️ Mapeamento Funcional Frontend: VendaFácil Brasil (Versão 2.2)

Este documento descreve a arquitetura de funções do frontend e seu contrato estrito com o backend definitivo. O princípio fundamental é **RPC-First**: o frontend é um consumidor de funções, não um manipulador de tabelas.

## 1. Núcleo de Dados (`AuthProvider.tsx`)
Localizado em: `src/components/auth-provider.tsx`. Este é o motor que proíbe qualquer escrita direta nas tabelas de faturamento.

| Função | Parâmetros | Responsabilidade | Contrato RPC |
| :--- | :--- | :--- | :--- |
| `abrirComanda` | `mesa, cliente` | Inicia um atendimento. No PDV, mesa = "0". | Direct Insert (`comandas`) |
| `adicionarItem` | `comandaId, productId, qty, [price]` | Lança item. Banco calcula `line_total`. | `rpc_add_item_to_comanda` (4 params) |
| `fecharComanda` | `comandaId, method` | Soma totais, gera venda e fecha conta. | `rpc_close_comanda_to_sale` (3 params) |
| `marcarItemConcluido` | `itemId` | Finaliza preparo no KDS/BDS. | `rpc_mark_order_item_done` (1 param) |
| `addSale` | `cart, method` | Fluxo sequencial para vendas rápidas no balcão. | Sequence: Open -> Add -> Close |
| `refreshStatus` | - | Sincroniza dados locais com o estado real do banco. | Multi-table fetch |

## 2. Fluxos Operacionais

### 🛒 Ponto de Venda (PDV)
- **Localização**: `/sales/new`
- **Regra**: Utiliza exclusivamente `price_cents`. Não tenta calcular subtotais para persistência.
- **Ação**: Ao finalizar, delega ao banco a criação do registro de venda atômico.

### 📋 Gestão de Comandas
- **Localização**: `/comandas`
- **Regra**: Consome a VIEW `v_comandas_totais`. O frontend nunca tenta somar os itens da tela para obter o total da conta; ele lê o que o banco processou.

### 🍳 Monitores de Produção (KDS/BDS)
- **Localização**: `/painel/cozinha` e `/painel/bar`
- **Filtro**: Exibe apenas itens com `status = 'pending'`.
- **Transição**: O botão de conclusão dispara `rpc_mark_order_item_done`. O item desaparece da tela apenas após o banco confirmar a transição para `done`.

## 3. Gestão e Inteligência

### 📊 Dashboard e Relatórios
- **Cálculo de CMV**: O frontend percorre as vendas, busca o `cost_cents` no catálogo e projeta a margem de lucro.
- **Faturamento**: Baseia-se na coluna `total_cents` das vendas ou `line_total` dos itens (todas persistidas como inteiros).

### 🤖 Inteligência Artificial
- **Snapshot**: A IA recebe um objeto JSON contendo o estado atual do estoque e das vendas do período.
- **Contexto**: Analisa tendências de faturamento e riscos de ruptura de estoque.

## 4. Regras de Ouro (Contrato Inviolável)

1.  **Preços em Centavos**: `price_cents` no catálogo, `unit_price` na venda. Exibição via `/ 100`.
2.  **Status Restritos**: Itens de pedido aceitam apenas `pending`, `done` ou `canceled`.
3.  **Coluna line_total**: É de apenas leitura (`GENERATED ALWAYS`). Tentativas de envio via frontend gerarão erro 400.
4.  **Parâmetros Nomeados**: Chamadas `supabase.rpc()` devem usar objetos com chaves prefixadas com `p_`.

---
*Documentação sincronizada com o Backend Definitivo v2.2.*