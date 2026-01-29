-- This script is idempotent and can be run multiple times.

-- Create customers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    cpf TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments to columns
COMMENT ON COLUMN public.customers.id IS 'Unique identifier for each customer';
COMMENT ON COLUMN public.customers.store_id IS 'Foreign key to the stores table';
COMMENT ON COLUMN public.customers.name IS 'Customer''s full name';
COMMENT ON COLUMN public.customers.email IS 'Customer''s email address';
COMMENT ON COLUMN public.customers.phone IS 'Customer''s phone number';
COMMENT ON COLUMN public.customers.cpf IS 'Customer''s CPF (Brazilian individual taxpayer registry number)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_store_id_created_at ON public.customers(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_store_id_email ON public.customers(store_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_store_id_phone ON public.customers(store_id, phone);

-- Add unique constraints
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
        ALTER TABLE public.customers ADD CONSTRAINT customers_store_id_cpf_key UNIQUE (store_id, cpf) WHERE (cpf IS NOT NULL);
    END IF;
END;
$$;


-- RLS Policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure no conflicts
DROP POLICY IF EXISTS "Users can manage their own store's customers" ON public.customers;
DROP POLICY IF EXISTS "SaaS Admins can read all customers" ON public.customers;


-- Helper function to check if a user is a member of a store
CREATE OR REPLACE FUNCTION is_store_member(p_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Case 1: User is the owner of the store
    (SELECT 1 FROM public.stores WHERE id = p_store_id AND user_id = auth.uid())
    UNION ALL
    -- Case 2: User is a member of the store
    (SELECT 1 FROM public.store_members WHERE store_id = p_store_id AND user_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- Users can perform any action on customers of stores they are members of
CREATE POLICY "Users can manage their own store's customers"
ON public.customers
FOR ALL
TO authenticated
USING (is_store_member(store_id))
WITH CHECK (is_store_member(store_id));

-- This policy will be added in a later migration, but is here for context.
-- CREATE POLICY "SaaS Admins can read all customers"
-- ON public.customers
-- FOR SELECT
-- TO authenticated
-- USING (is_saas_admin());
