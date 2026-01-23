-- 1. Funções Auxiliares de Segurança
-- (Estas funções são usadas pelas políticas RLS)

-- Verifica se um usuário é o proprietário de uma loja
CREATE OR REPLACE FUNCTION "public"."is_store_owner"(p_store_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função leia a tabela 'stores' sem ser bloqueada pela RLS.
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM "public"."stores"
    WHERE "id" = p_store_id AND "user_id" = p_user_id
  );
END;
$$;

-- Verifica se um usuário é membro (proprietário ou staff) de uma loja
CREATE OR REPLACE FUNCTION "public"."is_store_member"(p_store_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função leia as tabelas 'stores' e 'store_members' sem ser bloqueada pela RLS.
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "public"."stores" WHERE "id" = p_store_id AND "user_id" = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM "public"."store_members" WHERE "store_id" = p_store_id AND "user_id" = p_user_id
  );
END;
$$;


-- 2. Funções de RPC (para serem chamadas pela aplicação)

-- Função para criar uma nova loja e adicionar o criador como membro admin
CREATE OR REPLACE FUNCTION "public"."create_new_store"(
    p_name text,
    p_legal_name text,
    p_cnpj text,
    p_address jsonb,
    p_phone text,
    p_timezone text
)
RETURNS "public"."stores"
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função crie a loja e o membro, bypassando as políticas RLS que ainda não se aplicariam.
                 -- A segurança é mantida pois a função usa auth.uid() para atribuir a propriedade.
AS $$
DECLARE
  new_store "public"."stores";
BEGIN
  -- Insere a nova loja, atribuindo a propriedade ao usuário logado
  INSERT INTO "public"."stores" ("user_id", "name", "legal_name", "cnpj", "address", "phone", "timezone")
  VALUES (auth.uid(), p_name, p_legal_name, p_cnpj, p_address, p_phone, p_timezone)
  RETURNING * INTO new_store;

  -- Adiciona o proprietário como um membro com papel 'admin'
  INSERT INTO "public"."store_members" ("user_id", "store_id", "role")
  VALUES (auth.uid(), new_store.id, 'admin');

  RETURN new_store;
END;
$$;

-- Função para buscar os membros de uma loja (com detalhes do perfil)
CREATE OR REPLACE FUNCTION "public"."get_store_members"(p_store_id uuid)
RETURNS TABLE("user_id" uuid, "store_id" uuid, "role" text, "name" text, "email" text, "avatar_url" text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- A verificação de permissão é feita aqui dentro.
  -- Apenas membros da loja podem ver outros membros.
  SELECT
    m.user_id,
    m.store_id,
    m.role,
    u.name,
    u.email,
    u.avatar_url
  FROM "public"."store_members" m
  JOIN "public"."users" u ON m.user_id = u.id
  WHERE m.store_id = p_store_id AND "public".is_store_member(p_store_id, auth.uid());
$$;

-- Função para decrementar o estoque de um produto
CREATE OR REPLACE FUNCTION "public"."decrement_stock"(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id uuid;
BEGIN
  -- Busca a loja do produto para verificação de permissão
  SELECT store_id INTO v_store_id FROM "public"."products" WHERE id = p_product_id;

  -- Garante que o usuário que está chamando a função é membro da loja
  IF "public".is_store_member(v_store_id, auth.uid()) THEN
    UPDATE "public"."products"
    SET "stock_qty" = "stock_qty" - p_quantity
    WHERE "id" = p_product_id;
  ELSE
    -- Se não for membro, levanta um erro para o cliente
    RAISE EXCEPTION 'Permission denied to decrement stock for this product.';
  END IF;
END;
$$;