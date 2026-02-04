# Auditoria de Backend: VendaFácil SaaS
**Estado Real do Supabase - Versão 2.0 (ESTABILIZADO)**

## 1. Mapeamento da Infraestrutura
O backend utiliza o padrão Database-as-an-API, com toda a lógica de integridade e transação residindo no PostgreSQL.

- **Total de Tabelas Operacionais:** 21
- **Estrutura Central:** Unificada em torno de `order_items`.
- **Segurança:** RLS ativo em todas as tabelas sensíveis.

## 2. Solução de Unificação (Estoque e Vendas)
A redundância crítica entre `comanda_itens` e `sale_items` foi resolvida com a implementação da tabela `order_items`.

### 2.1 Tabela `public.order_items`
Esta é a **única fonte da verdade** para qualquer item registrado no sistema.
- **Vínculos:** Possui FKs opcionais para `comanda_id` e `sale_id`.
- **Cálculo Nativo:** A coluna `line_total` é gerada automaticamente (`quantity * unit_price`).
- **Estados de Preparo:** Controlados pela coluna `status` ('pending','queued','in_progress','done','canceled').

### 2.2 Compatibilidade Legada
Para evitar quebras no frontend atual, o banco expõe as views:
- `public.comanda_itens` (View de `order_items` filtrada por comanda)
- `public.sale_items` (View de `order_items` filtrada por venda)

## 3. RPCs Transacionais (API do Banco)
O sistema bloqueia inserts diretos em favor de funções atômicas:
1. `rpc_add_item_to_comanda`: Adiciona itens garantindo o preço do produto no momento da inserção.
2. `rpc_mark_order_item_done`: Finaliza o preparo no KDS/BDS e impede que o item reapareça.
3. `rpc_close_comanda_to_sale`: Fecha o atendimento, calcula o financeiro e gera a venda em um único passo.

## 4. Parecer Técnico
| Critério | Avaliação |
| :--- | :--- |
| **Integridade** | **Excelente.** Unificação concluída. |
| **Segurança** | **Alta.** RLS isola lojas e protege ações administrativas. |
| **Escalabilidade** | **Pronta.** Uso de RPCs reduz a carga de lógica no servidor de aplicação. |

**Status Final:** O backend está sólido e consistente. Eventuais erros de UI devem ser resolvidos ajustando a chamada das RPCs no frontend.
