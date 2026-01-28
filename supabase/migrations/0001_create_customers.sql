-- PARTE 2: CRM - TABELA DE CLIENTES
-- Este script cria a tabela de clientes e suas políticas de segurança.
-- É idempotente e pode ser executado com segurança múltiplas vezes.

-- Helper function to check if a user is a member of a store (owner or member)
-- This simplifies RLS policies across the application.
CREATE OR REPLACE FUNCTION public.is_store_member(p_store_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_member boolean;
BEGIN
  SELECT EXISTS (
    -- Check if the user is the owner
    SELECT 1 FROM public.stores s WHERE s.id = p_store_id AND s.user_id = p_user_id
    UNION ALL
    -- Check if the user is a member (future-proofing for a members table)
    SELECT 1 FROM public.store_members sm WHERE sm.store_id = p_store_id AND sm.user_id = p_user_id
  ) INTO is_member;
  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    cpf text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT customers_pkey PRIMARY KEY (id),
    CONSTRAINT customers_store_id_fkey FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Add comments for clarity
COMMENT ON TABLE public.customers IS 'Stores customer information for each tenant.';
COMMENT ON COLUMN public.customers.cpf IS 'Brazilian individual taxpayer registry identification.';

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS customers_store_id_created_at_idx ON public.customers USING btree (store_id, created_at);
CREATE INDEX IF NOT EXISTS customers_store_id_email_idx ON public.customers USING btree (store_id, email);
CREATE INDEX IF NOT EXISTS customers_store_id_phone_idx ON public.customers USING btree (store_id, phone);

-- 3. Add unique constraints, making them idempotent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'customers_store_id_email_key' AND conrelid = 'public.customers'::regclass
    ) THEN
        ALTER TABLE public.customers ADD CONSTRAINT customers_store_id_email_key UNIQUE (store_id, email);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'customers_store_id_cpf_key' AND conrelid = 'public.customers'::regclass
    ) THEN
        -- Note: This unique constraint only applies where cpf is not null
        -- Supabase requires this to be done via a unique index for RLS to work correctly.
        CREATE UNIQUE INDEX IF NOT EXISTS customers_store_id_cpf_unique_idx ON public.customers (store_id, cpf) WHERE cpf IS NOT NULL;
    END IF;
END;
$$;


-- 4. Enable Row Level Security and define policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean state
DROP POLICY IF EXISTS "Allow full access to own store customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage their own store's customers" ON public.customers;

-- Create RLS policy for customers table
CREATE POLICY "Users can manage their own store's customers"
ON public.customers
FOR ALL
USING (public.is_store_member(store_id, auth.uid()))
WITH CHECK (public.is_store_member(store_id, auth.uid()));

COMMENT ON POLICY "Users can manage their own store's customers" ON public.customers IS 'Ensures users can only access and manage customers belonging to their store.';
