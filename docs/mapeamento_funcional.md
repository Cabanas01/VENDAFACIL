# 🗺️ Mapeamento Funcional Frontend — VendaFácil Brasil v3.1 (DEFINITIVO)

Este documento define o contrato de integração entre o Frontend (Next.js) e o Backend (PostgreSQL/Supabase). O sistema segue o princípio **RPC-First**: toda lógica de negócio, cálculos financeiros e transições de estado ocorrem no banco de dados.

## 1. Arquitetura de Sincronização
O banco de dados PostgreSQL é a única fonte da verdade para faturamento e produção. O frontend atua como um cliente disciplinado que delega inteligência ao servidor.

| Camada | Responsabilidade |
| :--- | :--- |
| **Frontend** | UI, Orquestração de Fluxo e Exibição de Dados. |
| **Backend (RPC)** | Cálculos, Baixa de Estoque e Integridade Financeira. |
| **Regra de Ouro** | O frontend NUNCA calcula, soma ou decide status financeiro para persistência. |

## 2. Contrato de Escrita (RPCs Oficiais)
Todas as mutações de dados financeiros e operacionais devem usar as seguintes funções:

| Função Frontend | Parâmetros | RPC PostgreSQL Corresponde | Responsabilidade |
| :--- | :--- | :--- | :--- |
| `abrirComanda` | `p_mesa, p_cliente_nome` | `abrir_comanda` | Cria comanda com status 'aberta'. Mesa "0" reserva para PDV. |
| `adicionarItem` | `comandaId, productId, qty` | `adicionar_item_comanda` | Insere item na tabela `sale_items`. Banco resolve preço e subtotal. |
| `fecharComanda` | `comandaId, method, [caixaId]` | `fechar_comanda` | Soma itens, gera venda e fecha conta de forma atômica no servidor. |
| `marcarItemConcluido`| `itemId` | `marcar_item_concluido` | Transição de status de 'pending' para 'done' na tabela `sale_items`. |
| `addSale` | `cart, method` | (Encadeamento RPC) | Fluxo sequencial para vendas rápidas no balcão. |

## 3. Regras de Integridade Financeira
1.  **Moeda**: Valores circulam como inteiros (`price_cents`). Exibição via `value / 100`.
2.  **subtotal_cents**: Coluna `GENERATED ALWAYS` na tabela `sale_items`. O frontend nunca envia este valor.
3.  **unit_price**: Capturado pelo banco no momento da inserção via RPC para manter histórico de preços. O frontend não envia o preço no lançamento.

## 4. Monitoramento de Produção (KDS / BDS)
Os painéis de cozinha e bar operam estritamente sobre a tabela física **`public.sale_items`**:
- **Filtro Ativo**: `status = 'pending'`.
- **Filtro Destino**: `destino_preparo` ('cozinha' ou 'bar').
- **Ação**: `marcar_item_concluido(item_id)` para remover da fila e marcar como entregue.

## 5. Domínio de Status (Schema Public)
O frontend respeita estritamente os valores permitidos pelo banco:
- `pending`: Aguardando preparo ou entrega.
- `done`: Finalizado/Entregue.
- `canceled`: Estornado (não contabiliza no faturamento).

---
*Este mapeamento é a autoridade técnica final. Qualquer divergência entre UI e Banco deve ser resolvida ajustando as chamadas aqui definidas.*
