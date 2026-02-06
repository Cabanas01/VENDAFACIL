# 🗺️ Mapeamento Funcional Frontend — VendaFácil Brasil v3.1 (OFICIAL)

Este documento define o contrato de integração entre o Frontend (Next.js) e o Backend (PostgreSQL/Supabase). O sistema segue o princípio **RPC-First**: toda lógica de negócio, cálculos financeiros e transições de estado ocorrem no banco de dados.

## 1. Arquitetura Geral
- **Banco**: PostgreSQL (Supabase)
- **Padrão**: RPC-First
- **Fonte da Verdade**: Banco de Dados
- **Frontend**: Next.js (cliente disciplinado)
- **Regra Crítica**: Frontend não calcula nem persiste valores financeiros.

## 2. Contrato de Escrita (RPCs Oficiais)
Todas as mutações de dados financeiros e operacionais devem usar as seguintes funções:

| Função Frontend | Parâmetros | RPC PostgreSQL | Responsabilidade |
| :--- | :--- | :--- | :--- |
| `abrirComanda` | `p_mesa, p_cliente_nome` | `abrir_comanda` | Cria comanda com status 'aberta'. Mesa 0 reserva para PDV. |
| `adicionarItem` | `comandaId, productId, qty` | `adicionar_item_comanda` | Insere item na tabela `sale_items`. Banco resolve preço e subtotal. |
| `fecharComanda` | `comandaId, method, [caixaId]` | `fechar_comanda` | Soma itens, gera venda e fecha conta de forma atômica no servidor. |
| `marcarItemConcluido`| `itemId` | `marcar_item_concluido` | Transição de status de 'pending' para 'done' na tabela `sale_items`. |

## 3. Regras de Integridade Financeira
1.  **Moeda**: Valores circulam como inteiros (`price_cents`). Exibição via `value / 100`.
2.  **subtotal_cents**: Coluna `GENERATED ALWAYS` na tabela `sale_items`. O frontend nunca envia este valor.
3.  **unit_price**: Capturado pelo banco no momento da inserção via RPC. O frontend não envia o preço no lançamento.

## 4. Monitoramento de Produção (KDS / BDS)
Os painéis operam sobre a tabela física **`public.sale_items`**:
- **Filtro Ativo**: `status = 'pending'`.
- **Filtro Destino**: `destino_preparo` ('cozinha' ou 'bar').
- **Ação**: `marcar_item_concluido(item_id)` para remover da fila.

## 5. Domínio de Status
- `pending`: Aguardando preparo/entrega.
- `done`: Finalizado/Entregue.
- `canceled`: Estornado (não contabiliza no faturamento).

---
*Este mapeamento é a autoridade técnica final. Qualquer divergência deve ser resolvida ajustando as RPCs no backend.*
