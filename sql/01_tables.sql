-- Este script foi projetado para ser executado de forma segura múltiplas vezes.
-- Ele remove tabelas antigas antes de recriá-las.

-- 1. Limpeza Inicial (removendo objetos na ordem inversa de dependência)
-- A opção CASCADE remove automaticamente políticas, gatilhos e chaves dependentes.
DROP TABLE IF EXISTS "public"."sale_items" CASCADE;
DROP TABLE IF EXISTS "public"."sales" CASCADE;
DROP TABLE IF EXISTS "public"."products" CASCADE;
DROP TABLE IF EXISTS "public"."cash_registers" CASCADE;
DROP TABLE IF EXISTS "public"."store_members" CASCADE;
DROP TABLE IF EXISTS "public"."stores" CASCADE;
DROP TABLE IF EXISTS "public"."users" CASCADE;

-- 2. Criação das Tabelas

-- Tabela de Usuários (perfil público)
CREATE TABLE "public"."users" (
    "id" uuid NOT NULL,
    "email" text,
    "name" text,
    "avatar_url" text,
    CONSTRAINT "users_pkey" PRIMARY KEY (id),
    CONSTRAINT "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de Lojas
CREATE TABLE "public"."stores" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "name" text NOT NULL,
    "legal_name" text,
    "cnpj" text,
    "logo_url" text,
    "address" jsonb,
    "phone" text,
    "timezone" text DEFAULT 'America/Sao_Paulo',
    "settings" jsonb,
    CONSTRAINT "stores_pkey" PRIMARY KEY (id)
);

-- Tabela de Membros da Loja
CREATE TABLE "public"."store_members" (
    "user_id" uuid NOT NULL,
    "store_id" uuid NOT NULL,
    "role" text NOT NULL DEFAULT 'staff'::text,
    CONSTRAINT "store_members_pkey" PRIMARY KEY (user_id, store_id),
    CONSTRAINT "store_members_store_id_fkey" FOREIGN KEY (store_id) REFERENCES "public"."stores"(id) ON DELETE CASCADE
);

-- Tabela de Produtos
CREATE TABLE "public"."products" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "store_id" uuid NOT NULL,
    "name" text NOT NULL,
    "category" text,
    "price_cents" integer NOT NULL DEFAULT 0,
    "cost_cents" integer,
    "stock_qty" integer NOT NULL DEFAULT 0,
    "min_stock_qty" integer,
    "active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "products_pkey" PRIMARY KEY (id),
    CONSTRAINT "products_store_id_fkey" FOREIGN KEY (store_id) REFERENCES "public"."stores"(id) ON DELETE CASCADE
);

-- Tabela de Caixas
CREATE TABLE "public"."cash_registers" (
    "id" text NOT NULL,
    "store_id" uuid NOT NULL,
    "opened_at" timestamp with time zone NOT NULL DEFAULT now(),
    "closed_at" timestamp with time zone,
    "opening_amount_cents" integer NOT NULL,
    "closing_amount_cents" integer,
    CONSTRAINT "cash_registers_pkey" PRIMARY KEY (id),
    CONSTRAINT "cash_registers_store_id_fkey" FOREIGN KEY (store_id) REFERENCES "public"."stores"(id) ON DELETE CASCADE
);

-- Tabela de Vendas
CREATE TABLE "public"."sales" (
    "id" text NOT NULL,
    "store_id" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "total_cents" integer NOT NULL,
    "payment_method" text NOT NULL,
    CONSTRAINT "sales_pkey" PRIMARY KEY (id),
    CONSTRAINT "sales_store_id_fkey" FOREIGN KEY (store_id) REFERENCES "public"."stores"(id) ON DELETE CASCADE
);

-- Tabela de Itens da Venda
CREATE TABLE "public"."sale_items" (
    "id" text NOT NULL,
    "sale_id" text NOT NULL,
    "productId" uuid,
    "product_name_snapshot" text NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price_cents" integer NOT NULL,
    "subtotal_cents" integer NOT NULL,
    CONSTRAINT "sale_items_pkey" PRIMARY KEY (id),
    CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES "public"."sales"(id) ON DELETE CASCADE,
    CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"(id) ON DELETE SET NULL
);
