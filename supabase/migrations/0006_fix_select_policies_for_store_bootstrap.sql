-- Migration: Fix Select Policies for Store Bootstrap
-- Descrição: Garante que o app consiga ler os dados de loja, membros e acesso no carregamento inicial.

-- Limpeza
DROP POLICY IF EXISTS "stores_select_bootstrap" ON public.stores;
DROP POLICY IF EXISTS "store_members_select_bootstrap" ON public.store_members;
DROP POLICY IF EXISTS "store_access_select_bootstrap" ON public.store_access;

-- Função auxiliar robusta
CREATE OR REPLACE FUNCTION public.is_store_member(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = p_store_id
    AND user_id = auth.uid()
  );
$$;

-- Policies de SELECT
CREATE POLICY "stores_select_bootstrap" ON public.stores
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_store_member(id));

CREATE POLICY "store_members_select_bootstrap" ON public.store_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_members.store_id AND s.user_id = auth.uid())
);

CREATE POLICY "store_access_select_bootstrap" ON public.store_access
FOR SELECT TO authenticated
USING (is_store_member(store_id));