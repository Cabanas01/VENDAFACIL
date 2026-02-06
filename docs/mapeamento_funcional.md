# 🗺️ Mapeamento Funcional Frontend — VendaFácil Brasil v5.0 (OFICIAL)

Este documento define o contrato de integração definitiva entre o Frontend (Next.js) e o Backend (PostgreSQL/Supabase). O sistema segue o padrão **COMANDA-FIRST**.

## 1. Arquitetura de Fluxo
- **Entidade Raiz**: `public.comandas`. O atendimento começa e termina aqui.
- **Faturamento**: A `public.sales` é gerada apenas no momento do fechamento da comanda via RPC.
- **Produção**: Gerida pela tabela `public.order_items`.

## 2. Contrato de Escrita (RPCs v5.0)
Todas as operações transacionais devem utilizar exclusivamente estas funções:

| Função Frontend | RPC PostgreSQL | Responsabilidade |
| :--- | :--- | :--- |
| `getOrCreateComanda` | `rpc_get_or_create_open_comanda` | Localiza comanda ativa ou cria nova. Mesa 0 = PDV. |
| `adicionarItem` | `rpc_add_item_to_comanda` | Adiciona item. Banco resolve preço e estoque. |
| `finalizarAtendimento` | `rpc_close_comanda_to_sale` | Fecha comanda, gera venda, calcula totais e baixa no caixa. |
| `concluirPreparo`| `rpc_mark_order_item_done` | Move item de 'pending' para 'done' (KDS/BDS). |

## 3. Regras de Integridade Financeira
1.  **Moeda**: Valores circulam como inteiros (`price_cents`). Exibição via `value / 100`.
2.  **line_total**: Coluna `GENERATED ALWAYS` no banco. O frontend apenas lê.
3.  **numeric**: Parâmetro `p_quantity` deve ser enviado como Number (JS), nunca formatado como string no JSON da RPC.

## 4. Monitoramento de Produção (KDS / BDS)
Os painéis operam sobre a view **`public.production_snapshot`**:
- **Filtro Nativo**: Apenas itens com `status = 'pending'`.
- **Ação**: Chamar `rpc_mark_order_item_done` para remover da fila.

## 5. Máquina de Estados (Domínios)
### Comandas (`comandas.status`)
- `aberta`: Atendimento em curso.
- `fechada`: Conta paga e encerrada.
- `cancelada`: Atendimento anulado.

### Itens (`order_items.status`)
- `pending`: Aguardando preparo/entrega.
- `done`: Finalizado/Entregue.
- `canceled`: Estornado.

---
*Versão 5.0 Consolidada. Proibido o uso de .insert() ou .update() em tabelas financeiras pelo cliente.*
