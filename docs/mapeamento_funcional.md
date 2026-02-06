# 🗺️ Mapeamento Funcional Frontend — VendaFácil Brasil v5.1 (OFICIAL)

Este documento define o contrato definitivo de integração entre o Frontend (Next.js) e o Backend (PostgreSQL/Supabase). 
O sistema segue rigorosamente o padrão **COMANDA-FIRST**.

## 1. Arquitetura de Fluxo

- **Entidade Raiz**: `public.comandas`. Todo atendimento começa, evolui e termina em uma comanda.
- **Faturamento**: A tabela `public.sales` só é criada no fechamento da comanda, via RPC.
- **Itens do Atendimento**: Geridos exclusivamente via RPC e persistidos em `public.comanda_items`.
- **Produção (KDS / BDS)**: Operada através da view `public.production_snapshot`.

## 2. Contrato de Escrita (RPCs v5.1)

🚨 O frontend só pode escrever dados através destas funções:

| Função Frontend | RPC PostgreSQL | Responsabilidade |
| :--- | :--- | :--- |
| `getOrCreateComanda` | `rpc_get_or_create_open_comanda` | Busca comanda aberta ou cria nova. Mesa 0 = PDV |
| `adicionarItem` | `rpc_add_item_to_comanda` | Adiciona item à comanda. Preço e totais resolvidos no banco |
| `finalizarAtendimento` | `rpc_close_comanda_to_sale` | Fecha comanda, gera venda, calcula totais e registra pagamento |
| `concluirPreparo`| `rpc_mark_order_item_done` | Atualiza status do item para done (KDS/BDS) |

## 3. Regras de Integridade Financeira

1.  **Moeda**: Todos os valores persistidos usam centavos (integer). Exibição: `valor / 100`.
2.  **line_total**: Campo `GENERATED ALWAYS` no banco. O frontend **NUNCA** calcula.
3.  **Quantidade (numeric)**: `p_quantity` deve ser enviado como `Number(quantity)`. Nunca string ou integer forçado.

## 4. Monitoramento de Produção (KDS / BDS)

Os painéis operam exclusivamente sobre a view **`public.production_snapshot`**:
- **Filtro Nativo**: Retorna apenas itens `status = 'pending'`.
- **Filtro Destino**: `destino_preparo` ('cozinha' ou 'bar').
- **Ação**: Chamar `rpc_mark_order_item_done` para remover da fila.

## 5. Máquina de Estados (Domínios)

### Comandas (`comandas.status`)
- `aberta`: Atendimento em curso.
- `fechada`: Conta paga e encerrada.

### Itens (`comanda_items.status`)
- `pending`: Aguardando preparo/entrega.
- `done`: Finalizado/Entregue.
- `canceled`: Estornado.

## 6. Proibições Absolutas no Frontend

🚫 **É terminantemente proibido:**
1.  `.insert()` ou `.update()` em: `sales`, `comandas`, `comanda_items`, `cash_register`.
2.  Calcular total, subtotal ou preço unitário no cliente para fins de persistência.
3.  Criar `sale_id` antes do fechamento atômico da comanda.

---
*Versão 5.1 Consolidada. Autoridade máxima reside no PostgreSQL.*
