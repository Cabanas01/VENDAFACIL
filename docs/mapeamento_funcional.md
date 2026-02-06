# 🗺️ Mapeamento Funcional: VendaFácil Brasil

Este documento descreve a arquitetura de funções do frontend e seu contrato com o backend RPC-First.

## 1. Motor de Dados (AuthProvider)
Localizado em: `src/components/auth-provider.tsx`

| Função | Parâmetros | Responsabilidade |
| :--- | :--- | :--- |
| `abrirComanda` | `mesa, cliente` | Insere registro em `comandas` com status 'aberta'. |
| `adicionarItem` | `comandaId, productId, qty, [price]` | Chama `rpc_add_item_to_comanda` (4 params). O banco calcula o total e destino. |
| `fecharComanda` | `comandaId, method, [caixaId]` | Chama `rpc_close_comanda_to_sale`. Soma totais no banco e gera a venda. |
| `marcarItemConcluido`| `itemId` | Chama `rpc_mark_order_item_done`. Usado por KDS e BDS. |
| `addSale` | `cart, method` | Fluxo atômico para vendas de balcão via RPCs encadeadas. |
| `refreshStatus` | - | Revalida todos os dados para garantir paridade com o PostgreSQL. |

## 2. Ações de Servidor (Server Actions)
Localizadas em: `src/app/actions/`

- **`sales-actions.ts`**: Processa transações complexas de PDV via RPC para evitar latência.
- **`admin-actions.ts`**: Lógica de concessão de planos e auditoria de sistema SaaS.

## 3. Inteligência Artificial (Genkit)
Localizada em: `src/ai/flows/`

- **`ai-chat-flow.ts`**: `askAi` - Processa consultas contextuais baseadas em estoque e lucro bruto.
- **`summarize-financial-reports.ts`**: Analisa relatórios financeiros e extrai ações práticas.

## 4. Regras de Ouro (Contrato Frontend-Backend)
1. **Nunca Calcular Totais**: O frontend exibe `line_total` (banco), mas nunca tenta salvá-lo ou enviá-lo.
2. **Preços em Cents**: Toda comunicação de valores usa inteiros (`price_cents`).
3. **Status Restritos**: Itens de pedido aceitam estritamente `pending`, `done` ou `canceled`.
4. **RPC Only**: Nenhuma escrita em tabelas financeiras (`order_items`, `sales`) é feita via `.insert()` direto no cliente.

---
*Documentação técnica sincronizada com a Versão 2.0 do Backend.*
