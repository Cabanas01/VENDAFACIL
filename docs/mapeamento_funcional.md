# 🗺️ Mapeamento Funcional Frontend — VendaFácil Brasil v4.0 (OFFICIAL)

Este documento define o contrato de integração definitiva entre o Frontend (Next.js) e o Backend (PostgreSQL/Supabase) versão 4.0. O sistema segue o padrão **RPC-First**.

## 1. Arquitetura Geral
- **Banco**: PostgreSQL (Supabase)
- **Padrão**: RPC-First
- **Fonte da Verdade**: Tabelas `sales` e `sale_items`.
- **Integridade**: Toda lógica crítica reside no banco de dados.

## 2. Contrato de Escrita (RPCs v4.0)
Todas as mutações financeiras e operacionais devem utilizar exclusivamente as seguintes funções:

| Função Frontend | RPC PostgreSQL | Responsabilidade |
| :--- | :--- | :--- |
| `getOpenSale(mesa)` | `rpc_get_open_sale` | Busca ID da venda/comanda aberta para uma mesa. |
| `adicionarItem` | `rpc_add_item_to_sale` | Adiciona item à venda. Banco resolve preço e subtotal. |
| `fecharVenda` | `rpc_close_sale` | Finaliza venda com lock transacional e gera financeiro. |
| `marcarItemConcluido`| `rpc_mark_item_done` | Move item de 'pending' para 'done'. |
| `concluirTudo` | `rpc_mark_sale_items_done`| Conclui todos os itens de uma venda de uma vez. |

## 3. Regras de Integridade Financeira
1.  **Moeda**: Valores circulam como inteiros (`price_cents`). Exibição via `value / 100`.
2.  **subtotal_cents**: Coluna `GENERATED ALWAYS` na tabela `sale_items`.
3.  **unit_price**: Capturado automaticamente pelo banco no momento da inserção via RPC.

## 4. Monitoramento de Produção (KDS / BDS)
Os painéis operam sobre a view **`public.production_snapshot`**:
- **Filtro Nativo**: Itens com `status = 'pending'`.
- **Filtro Destino**: `destino_preparo` ('cozinha' ou 'bar').
- **Performance**: Utiliza índices parciais para resposta em milissegundos.

## 5. Máquina de Estados (Domínios)
### Itens (`sale_items`)
- `pending`: Aguardando preparo.
- `done`: Finalizado/Entregue.
- `cancelled`: Estornado.

### Vendas (`sales`)
- `open`: Comanda ativa (atendimento em curso).
- `paid`: Venda concluída e paga.
- `cancelled`: Venda anulada.

---
*Versão 4.0 Consolidada. Qualquer divergência deve ser resolvida ajustando as RPCs no backend.*
