-- Migration: Padronização de RLS e Remoção de Funções Obsoletas
-- Bug Raiz: status_acesso no banco é 'ativo', mas as policies antigas buscavam 'active' or 'trial'.

-- 1. Remoção de policies antigas
DROP POLICY IF EXISTS "Allow members to manage their store data" ON public.products;
DROP POLICY IF EXISTS "Allow store members to read store data" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_all" ON public.products;

DROP POLICY IF EXISTS "Allow members to manage their store data" ON public.cash_registers;
DROP POLICY IF EXISTS "Allow store members to read store data" ON public.cash_registers;
DROP POLICY IF EXISTS "cash_registers_select" ON public.cash_registers;
DROP POLICY IF EXISTS "cash_registers_all" ON public.cash_registers;

DROP POLICY IF EXISTS "Allow members to manage their store data" ON public.customers;
DROP POLICY IF EXISTS "Allow store members to read store data" ON public.customers;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_all" ON public.customers;

DROP POLICY IF EXISTS "Allow members to manage their store data" ON public.sales;
DROP POLICY IF EXISTS "Allow store members to read store data" ON public.sales;
DROP POLICY IF EXISTS "sales_select" ON public.sales;
DROP POLICY IF EXISTS "sales_insert" ON public.sales;
DROP POLICY IF EXISTS "Allow members to insert sales if store active" ON public.sales;
DROP POLICY IF EXISTS "Allow members to select sales" ON public.sales;

DROP POLICY IF EXISTS "Allow members to manage their store data" ON public.sale_items;
DROP POLICY IF EXISTS "Allow store members to read store data" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_select" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert" ON public.sale_items;
DROP POLICY IF EXISTS "Allow members to insert sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow members to select sale items" ON public.sale_items;

DROP POLICY IF EXISTS "Allow store members to read store data" ON public.store_access;
DROP POLICY IF EXISTS "store_access_select" ON public.store_access;
DROP POLICY IF EXISTS "Allow members to select own store access" ON public.store_access;

-- 2. Dropar funções obsoletas
DROP FUNCTION IF EXISTS public.is_store_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_store_member(uuid);

-- 3. Criar a ÚNICA função oficial com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_store_member(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_members sm
    WHERE sm.store_id = p_store_id
      AND sm.user_id = auth.uid()
  );
$$;

-- 4. Recriar as policies oficiais
CREATE POLICY "store_access_select" ON public.store_access FOR SELECT TO authenticated USING (is_store_member(store_id));

CREATE POLICY "sales_select" ON public.sales FOR SELECT TO authenticated USING (is_store_member(store_id));
CREATE POLICY "sales_insert" ON public.sales FOR INSERT TO authenticated 
WITH CHECK (
  is_store_member(store_id)
  AND EXISTS (
    SELECT 1 FROM public.store_access sa 
    WHERE sa.store_id = sales.store_id 
    AND sa.status_acesso = 'ativo' 
    AND sa.data_inicio_acesso <= now() 
    AND sa.data_fim_acesso >= now()
  )
);

CREATE POLICY "sale_items_select" ON public.sale_items FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND is_store_member(s.store_id)));

CREATE POLICY "sale_items_insert" ON public.sale_items FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND is_store_member(s.store_id)));

CREATE POLICY "products_all" ON public.products FOR ALL TO authenticated USING (is_store_member(store_id)) WITH CHECK (is_store_member(store_id));
CREATE POLICY "customers_all" ON public.customers FOR ALL TO authenticated USING (is_store_member(store_id)) WITH CHECK (is_store_member(store_id));
CREATE POLICY "cash_registers_all" ON public.cash_registers FOR ALL TO authenticated USING (is_store_member(store_id)) WITH CHECK (is_store_member(store_id));
