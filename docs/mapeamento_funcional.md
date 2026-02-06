# 🗺️ Mapeamento Funcional Frontend — VendaFácil Brasil v5.3 (OFICIAL)

Este documento define o contrato definitivo, imutável e auditável de integração entre o Frontend (Next.js) e o Backend (PostgreSQL/Supabase).

O sistema segue rigorosamente o padrão COMANDA-FIRST.
O PostgreSQL é a autoridade máxima do domínio.

## 1. Arquitetura de Fluxo

- **Entidade Raiz**: `public.comandas`. Todo atendimento começa, evolui e termina em uma comanda.
- **PDV (Balcão)**: O PDV não é um fluxo separado. Ele é uma comanda padrão com `table_number = 0`.
- **Faturamento**: A tabela `public.sales` só é criada no fechamento da comanda, via RPC.
- **Itens do Atendimento**: Persistidos exclusivamente em `public.comanda_items` através de RPCs.
- **Produção (KDS / BDS)**: Operada somente via view `public.production_snapshot`.

## 2. Contrato de Escrita (RPCs v5.3)

🚨 O frontend só pode escrever dados através destas funções:

| Função Frontend | RPC PostgreSQL | Responsabilidade |
| :--- | :--- | :--- |
| `getOrCreateComanda` | `rpc_get_or_create_open_comanda` | Busca comanda aberta ou cria nova |
| `adicionarItem` | `rpc_add_item_to_comanda` | Adiciona item e resolve preço/totais |
| `finalizarAtendimento` | `rpc_close_comanda_to_sale` | Fecha comanda, gera venda e registra pagamento |
| `concluirPreparo`| `rpc_mark_order_item_done` | Atualiza item para done |

📌 Todas as RPCs são atômicas e transacionais.
📌 O frontend não faz retries manuais nem lógica paralela.

## 3. Regras de Integridade Financeira

- **Moeda**: Todos os valores vêm do banco em centavos. Exibição: `value / 100`.
- **line_total**: Campo `GENERATED ALWAYS` no banco. O frontend **NUNCA** calcula.
- **Quantidade (numeric)**: Sempre enviar `Number(quantity)`. ❌ Nunca string. ❌ Nunca integer forçado.

## 4. Pagamento (Contrato Obrigatório)

O frontend apenas informa o `payment_method`. O backend é responsável por:
1. Validar o método
2. Registrar o pagamento
3. Fechar a comanda
4. Criar a venda (`sales`)
5. Atualizar o caixa

📌 O frontend **NUNCA** calcula troco, altera status financeiro, cria `sale_id` ou decide se a venda foi concluída no client.

## 5. Monitoramento de Produção (KDS / BDS)

View única: `public.production_snapshot`.
- Retorna apenas itens `status = 'pending'`.
- Campo `destino_preparo`: 'cozinha' | 'bar'.
- Para remover da fila: `rpc_mark_order_item_done`.

## 6. Máquina de Estados

### Comandas (`comandas.status`)
- `aberta`
- `fechada`
📌 O frontend não altera status manualmente.

### Itens (`comanda_items.status`)
- `pending`
- `done`
- `canceled`

## 7. Proibições Absolutas no Frontend

🚫 **É terminantemente proibido:**
- Usar `.insert()` ou `.update()` em: `comandas`, `comanda_items`, `sales`, `cash_register`.
- Calcular ou persistir: `total`, `subtotal` ou `preço unitário`.
- Criar, armazenar ou manipular: `sale_id` durante atendimento, status financeiro ou lógica de fechamento no cliente.
- Chamar RPCs fora do contrato definido neste documento.

---
*Versão 5.3 — Se não é RPC, não existe. Se o banco não confirmou, nada aconteceu.*
