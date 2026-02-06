# 🗺️ Mapeamento Funcional Frontend: VendaFácil Brasil v3.0

Este documento define o contrato de integração entre o Frontend (Next.js) e o Backend (PostgreSQL/Supabase). O sistema segue o princípio **RPC-First**: toda lógica de negócio, cálculos financeiros e transições de estado ocorrem no banco de dados.

## 1. Núcleo de Dados (`AuthProvider.tsx`)
O `AuthProvider` é o motor central que proíbe qualquer escrita direta nas tabelas de faturamento.

| Função Frontend | Parâmetros | RPC PostgreSQL Corresponde | Responsabilidade |
| :--- | :--- | :--- | :--- |
| `abrirComanda` | `p_mesa, p_cliente` | `INSERT com status 'aberta'` | Inicia atendimento. Mesa "0" reserva para PDV direto. |
| `adicionarItem` | `comandaId, productId, qty, [price]` | `rpc_add_item_to_comanda` | Lança item. Banco resolve preço e destino de preparo. |
| `fecharComanda` | `comandaId, method, [caixaId]` | `rpc_close_comanda_to_sale` | Soma `line_total`, gera venda e fecha conta de forma atômica. |
| `marcarItemConcluido`| `itemId` | `rpc_mark_order_item_done` | Transição de status de `pending` para `done`. |
| `addSale` | `cart, method` | (Encadeamento RPC) | Fluxo sequencial para vendas rápidas no balcão. |

## 2. Regras de Integridade Financeira
1.  **Moeda**: Valores circulam como inteiros (`price_cents`). Exibição via `value / 100`.
2.  **line_total**: Coluna `GENERATED ALWAYS`. O frontend nunca tenta enviar este valor.
3.  **unit_price**: Capturado pelo banco no momento da inserção via RPC para manter histórico de preços.

## 3. Estados de Produção (KDS/BDS)
Os monitores de cozinha e bar operam estritamente sobre a tabela `order_items`:
- **Filtro**: `status = 'pending'`.
- **Destino**: `destino_preparo` ('cozinha' ou 'bar').
- **Ação**: `rpc_mark_order_item_done` para remover da fila e marcar como entregue.

## 4. Domínio de Status
O frontend respeita estritamente os valores permitidos pelo banco:
- `pending`: Aguardando preparo ou entrega.
- `done`: Finalizado/Entregue.
- `canceled`: Estornado (não contabiliza no faturamento).

---
*Este mapeamento é a autoridade técnica. Qualquer divergência entre UI e Banco deve ser resolvida ajustando as chamadas aqui definidas.*
