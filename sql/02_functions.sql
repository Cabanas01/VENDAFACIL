-- Este script define as funções que podem ser chamadas pela aplicação (RPC)
-- e as funções auxiliares de segurança usadas pelas políticas RLS.
-- O uso de 'CREATE OR REPLACE' torna o script seguro para ser executado múltiplas vezes.

-- 1. Funções Auxiliares de Segurança (para uso nas políticas RLS)

-- Verifica se um usuário é o proprietário de uma loja.
-- SECURITY DEFINER é usado para que a função execute com as permissões do criador da função, permitindo verificar tabelas que o usuário chamador talvez não tenha acesso direto.
CREATE OR REPLACE FUNCTION public.is_store_owner(p_store_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = p_store_id AND user_id = p_user_id
  );
END;
$$;

-- Verifica se um usuário é membro (proprietário ou staff) de uma loja.
CREATE OR REPLACE FUNCTION public.is_store_member(p_store_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.store_members
    WHERE store_id = p_store_id AND user_id = p_user_id
  );
END;
$$;


-- 2. Funções de RPC (para serem chamadas pela aplicação)

-- Cria uma nova loja e adiciona o criador como membro admin.
CREATE OR REPLACE FUNCTION public.create_new_store(
    p_name text,
    p_legal_name text,
    p_cnpj text,
    p_address jsonb,
    p_phone text,
    p_timezone text
)
RETURNS "public"."stores"
LANGUAGE plpgsql
-- SECURITY INVOKER (padrão): A função é executada com as permissões do usuário que a chama.
-- A função auth.uid() garante que a loja seja associada ao usuário autenticado.
AS $$
DECLARE
  new_store "public"."stores";
BEGIN
  -- Insere a nova loja
  INSERT INTO public.stores (user_id, name, legal_name, cnpj, address, phone, timezone)
  VALUES (auth.uid(), p_name, p_legal_name, p_cnpj, p_address, p_phone, p_timezone)
  RETURNING * INTO new_store;

  -- Adiciona o usuário que criou a loja como um membro com a função 'admin'
  INSERT INTO public.store_members (user_id, store_id, role)
  VALUES (auth.uid(), new_store.id, 'admin');

  RETURN new_store;
END;
$$;


-- Retorna os detalhes dos membros de uma loja específica.
CREATE OR REPLACE FUNCTION public.get_store_members(p_store_id uuid)
RETURNS TABLE(user_id uuid, store_id uuid, role text, name text, email text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    m.user_id,
    m.store_id,
    m.role,
    u.name,
    u.email,
    u.avatar_url
  FROM public.store_members m
  JOIN public.users u ON m.user_id = u.id
  WHERE m.store_id = p_store_id;
$$;

-- Decrementa o estoque de um produto após uma venda.
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE public.products
  SET stock_qty = stock_qty - p_quantity
  WHERE id = p_product_id;
END;
$$;