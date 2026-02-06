# 🗺️ Mapeamento Funcional: VendaFácil Brasil (Versão 2.1)

Este documento descreve a arquitetura de funções do frontend e seu contrato estrito com o backend RPC-First.

## 1. Motor de Dados (AuthProvider)
Localizado em: `src/components/auth-provider.tsx`

| Função | Parâmetros | Responsabilidade | Contrato RPC |
| :--- | :--- | :--- | :--- |
| `abrirComanda` | `mesa, cliente` | Insere registro em `comandas` com status 'aberta'. | Direct Insert (Table `comandas`) |
| `adicionarItem` | `comandaId, productId, qty, [price]` | Lança item na conta. O banco calcula o total e destino. | `rpc_add_item_to_comanda` (4 params) |
| `fecharComanda` | `comandaId, method` | Gera a venda e limpa a comanda de forma atômica. | `rpc_close_comanda_to_sale` (3 params) |
| `marcarItemConcluido`| `itemId` | Finaliza o preparo no KDS/BDS. | `rpc_mark_order_item_done` (1 param) |
| `addSale` | `cart, method` | Fluxo sequencial para vendas diretas no balcão. | Sequence: Open -> Add -> Close |
| `refreshStatus` | - | Revalida todos os dados locais com o PostgreSQL. | Multi-table fetch |

## 2. Inteligência Artificial (Genkit)
Localizada em: `src/ai/flows/`

- **`ai-chat-flow.ts`**: `askAi` - Processa consultas contextuais baseadas em estoque e lucro bruto.
- **`summarize-financial-reports.ts`**: Analisa relatórios financeiros e extrai ações práticas.

## 3. Regras de Ouro (Contrato Frontend-Backend)
1. **Nunca Calcular Totais**: O frontend exibe `line_total` retornado pelo banco, mas nunca tenta salvá-lo.
2. **Preços em Cents**: Toda comunicação de valores usa inteiros (`price_cents`).
3. **Status Restritos**: Itens de pedido aceitam estritamente `pending`, `done` ou `canceled`.
4. **Parâmetros Nomeados**: Todas as chamadas `supabase.rpc()` devem usar o objeto de parâmetros com prefixo `p_`.

---
*Documentação técnica sincronizada com a Versão 2.1 do Backend Definitivo.*
