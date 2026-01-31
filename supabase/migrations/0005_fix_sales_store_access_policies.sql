-- Migration: Fix Sales and Store Access Policies
-- Goal: Ensure sales can only be created if store_access is 'ativo' and valid.

-- 1. Cleanup
DROP POLICY IF EXISTS "Allow users to select own store access" ON public.store_access;
DROP POLICY IF EXISTS "Allow members to insert sales if store active" ON public.sales;
DROP POLICY IF EXISTS "Allow members to select sales" ON public.sales;
DROP POLICY IF EXISTS "Allow members to insert sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Allow members to select sale items" ON public.sale_items;

-- 2. Store Access SELECT
CREATE POLICY "Allow members to select own store access" ON public.store_access
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_members.store_id = store_access.store_id
    AND store_members.user_id = auth.uid()
  )
);

-- 3. Sales SELECT
CREATE POLICY "Allow members to select sales" ON public.sales
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_members.store_id = sales.store_id
    AND store_members.user_id = auth.uid()
  )
);

-- 4. Sales INSERT (The Guard)
CREATE POLICY "Allow members to insert sales if store active" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_members.store_id = sales.store_id
    AND store_members.user_id = auth.uid()
  ))
  AND
  (EXISTS (
    SELECT 1 FROM public.store_access sa
    WHERE sa.store_id = sa.store_id -- Self reference context
    AND sa.store_id = sales.store_id
    AND sa.status_acesso = 'ativo'
    AND sa.data_inicio_acesso <= now()
    AND sa.data_fim_acesso >= now()
  ))
);

-- 5. Sale Items Policies
CREATE POLICY "Allow members to select sale items" ON public.sale_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
  )
);

CREATE POLICY "Allow members to insert sale items" ON public.sale_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales
    WHERE sales.id = sale_items.sale_id
  )
);
