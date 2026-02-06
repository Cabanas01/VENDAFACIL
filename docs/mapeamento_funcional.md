# 🗺️ Mapeamento Funcional Frontend — VendaFácil Brasil v4.0 (OFICIAL)

Este documento define o contrato de integração definitiva entre o Frontend (Next.js) e o Backend (PostgreSQL/Supabase). O sistema segue rigorosamente o padrão **RPC-First**.

## 1. Arquitetura Base
- **Frontend**: Next.js 15 + Supabase Client.
- **Backend**: PostgreSQL (Autoridade Máxima).
- **Regra de Ouro**: O frontend **NUNCA** calcula totais, soma subtotais para persistência ou define status financeiros manualmente. Tudo é delegado às RPCs.

## 2. Contrato de Escrita (RPCs v4.0)
Todas as operações transacionais devem utilizar exclusivamente estas funções:

| Função Frontend | RPC PostgreSQL | Responsabilidade |
| :--- | :--- | :--- |
| `getOpenSale(mesa)` | `rpc_get_open_sale` | Localiza ou valida venda aberta para uma mesa/local. |
| `adicionarItem` | `rpc_add_item_to_sale` | Adiciona item à venda. O banco resolve preço e subtotal. |
| `fecharVenda` | `rpc_close_sale` | Finaliza venda com faturamento atômico e baixa no caixa. |
| `marcarItemConcluido`| `rpc_mark_item_done` | Move item de 'pending' para 'done' (KDS/BDS). |
| `concluirTudo` | `rpc_mark_sale_items_done`| Finaliza todos os itens de uma venda de uma vez. |

## 3. Regras de Integridade Financeira
1.  **Moeda**: Valores circulam como inteiros (`price_cents`). Exibição via `value / 100`.
2.  **subtotal_cents**: Coluna `GENERATED ALWAYS` no banco. O frontend apenas lê para exibição.
3.  **unit_price**: Capturado automaticamente pelo banco via RPC no momento da inserção.

## 4. Monitoramento de Produção (KDS / BDS)
Os painéis operam sobre a view **`public.production_snapshot`**:
- **Filtro Nativo**: Apenas itens com `status = 'pending'`.
- **Filtro Destino**: `destino_preparo` ('cozinha' ou 'bar').
- **Ação**: Chamar `rpc_mark_item_done` para remover da fila.

## 5. Máquina de Estados (Domínios)
### Vendas (`sales.status`)
- `open`: Atendimento em curso (Comanda).
- `paid`: Venda concluída e paga.
- `cancelled`: Venda anulada.

### Itens (`sale_items.status`)
- `pending`: Aguardando preparo/entrega.
- `done`: Finalizado/Entregue.
- `cancelled`: Estornado.

---
*Versão 4.0 Consolidada. Proibido o uso de .insert() ou .update() em tabelas financeiras pelo cliente.*
