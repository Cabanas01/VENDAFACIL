# Auditoria de Backend: VendaFácil SaaS
**Estado Real do Supabase**

## 1. Mapeamento da Infraestrutura
O backend atual é composto por um esquema denso, com lógica fortemente acoplada ao banco de dados (Database-as-an-API).

- **Total de Tabelas:** 21
- **Total de Colunas:** 186
- **Total de Funções (RPC):** 48
- **Total de Policies (RLS):** 29
- **Total de Índices:** 43

### 1.1 Entidades Críticas
As tabelas operacionais (`sales`, `comandas`, `products`) utilizam o tipo `numeric` para valores monetários e `uuid` para identificadores, o que é o padrão ouro para precisão financeira e escalabilidade.

## 2. Problemas Estruturais Identificados

### 2.1 Fragmentação de Itens (Redundância Crítica)
Existem duas tabelas de itens de consumo: `comanda_itens` e `sale_items`. 
- **Problema:** Se um pedido via comanda não migra de forma atômica para `sale_items` no fechamento, o histórico de vendas (`sales`) ficará inconsistente com o consumo real das comandas. 
- **Impacto:** Erros de fechamento de caixa e relatórios financeiros divergentes.

### 2.2 Inconsistência de Nomenclatura (Dívida de Contexto)
O banco apresenta um mix de idiomas e padrões:
- **Português:** `comandas`, `comanda_itens`, `abrir_atendimento`.
- **Inglês:** `sales`, `sale_items`, `cash_registers`.
- **Impacto:** Indica que o sistema foi construído em ciclos diferentes ou por desenvolvedores com padrões distintos, dificultando a manutenção preditiva.

### 2.3 Referências Fracas (Audit Log)
Na tabela `admin_logs`, a coluna `entity_id` é do tipo `text` em vez de `uuid`.
- **Problema:** Impede a criação de Foreign Keys para integridade referencial. Se uma loja ou usuário for deletado, os logs perdem o vínculo técnico (Orphan Logs).

### 2.4 Proliferação de RPCs
A proporção de **2.28 funções por tabela** (48/21) é elevada.
- **Dívida Técnica:** Muitas funções parecem ter responsabilidades sobrepostas (`abrir_atendimento` vs `abrir_comanda` | `registrar_venda` vs `registrar_pagamento`). Isso aumenta o risco de "Efeito Colateral" ao alterar uma regra de negócio no banco.

## 3. Lista de Dívidas Técnicas
1. **Falta de FKs Globais:** Apenas 19 relacionamentos para 21 tabelas. Tabelas como `discounts`, `integrations` e `suppliers` parecem estar isoladas ou dependentes de lógica exclusiva do código, sem proteção de integridade no banco.
2. **Desacoplamento de Caixa:** `cash_registers` usa `opened_by` e `closed_by`, mas a tabela `sales` referencia `cash_register_id`. É necessário garantir que as RLS de venda validem se o caixa referenciado pertence à loja e ao usuário logado.
3. **Índices Legados:** A existência de 43 índices para 21 tabelas sugere índices sobrepostos ou obsoletos de versões anteriores do esquema.

## 4. Avaliação e Parecer

| Critério | Avaliação |
| :--- | :--- |
| **Integridade** | **Regular.** As FKs básicas existem, mas a redundância de itens é perigosa. |
| **Segurança (RLS)** | **Boa.** O uso de funções como `is_saas_admin()` indica controle granular. |
| **Performance** | **Incerta.** O alto número de índices e funções pode impactar o tempo de resposta em escala. |

### Decisão Recomendada: **CORRIGIR (Refatoração Estrutural)**
O sistema **NÃO deve ser mantido como está** devido ao risco de deriva de dados entre Comandas e Vendas. 
O sistema **NÃO precisa ser resetado**, pois a fundação de Lojas, Usuários e Acessos está sólida.

**Plano de Ação:**
1. Unificar `comanda_itens` e `sale_items` em uma única estrutura de "Order Items".
2. Normalizar o idioma das tabelas (preferencialmente para Inglês, seguindo o padrão de `stores` e `users`).
3. Converter `entity_id` para UUID em `admin_logs`.
4. Auditar o código das 48 RPCs para remover duplicidades.
