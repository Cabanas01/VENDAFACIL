# 🗺️ Mapeamento Funcional Frontend: VendaFácil Brasil v3.0

Este documento define a arquitetura de integração entre o Frontend (Next.js) e o Backend (PostgreSQL via Supabase). O sistema segue o princípio **RPC-First**: toda lógica de negócio, cálculos financeiros e transições de estado ocorrem no banco de dados.

## 1. Núcleo de Dados (`AuthProvider.tsx`)
O `AuthProvider` é o motor central que proíbe qualquer escrita direta (`.insert()` ou `.update()`) nas tabelas de faturamento.

| Função Frontend | Parâmetros | RPC PostgreSQL Corresponde | Responsabilidade |
| :--- | :--- | :--- | :--- |
| `abrirComanda` | `mesa, cliente` | `abrir_comanda` | Inicia atendimento. Mesa "0" reserva para PDV. |
| `adicionarItem` | `comandaId, productId, qty` | `adicionar_item_comanda` | Lança item. Banco resolve preço e destino. |
| `fecharComanda` | `comandaId, method` | `fechar_comanda` | Soma `line_total`, gera venda e fecha conta. |
| `marcarItemConcluido`| `itemId` | `finalizar_preparo_item` | Altera status de `pending` para `done`. |
| `addSale` | `cart, method` | (Sequência de RPCs) | Fluxo atômico para vendas rápidas de balcão. |
| `refreshStatus` | - | (Várias) | Sincroniza estado local com o banco em tempo real. |

## 2. Regras de Integridade Financeira
1.  **Moeda**: Valores circulam no frontend apenas como inteiros (`price_cents`). Exibição é feita via `/ 100`.
2.  **line_total**: Coluna `GENERATED ALWAYS` no banco. O frontend **nunca** tenta enviar este valor.
3.  **unit_price**: Capturado pelo banco no momento do lançamento do item para evitar perda de histórico de preços.

## 3. Fluxo de Produção (KDS/BDS)
Os monitores de cozinha e bar não acessam views diretamente. Eles utilizam a função:
- `get_kitchen_queue(p_store_id, p_destino)`: Retorna apenas itens com `status = 'pending'`.
- A transição para `done` via `finalizar_preparo_item` remove o item da fila automaticamente.

## 4. Status de Itens (`OrderItemStatus`)
O frontend respeita estritamente o domínio do banco:
- `pending`: Aguardando preparo ou entrega.
- `done`: Item entregue ao cliente/finalizado.
- `canceled`: Item estornado (não conta para faturamento).

---
*Este mapeamento é o contrato final. Qualquer divergência entre UI e Banco deve ser resolvida ajustando a chamada das RPCs mapeadas aqui.*
