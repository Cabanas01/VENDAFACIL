-- PART 1: Enhance stores table with business_type and a proper status column.

-- Add business_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='business_type') THEN
        ALTER TABLE public.stores ADD COLUMN business_type TEXT NOT NULL DEFAULT 'general';
    END IF;
END
$$;

-- Add CHECK constraint for business_type
-- First, drop if an old one exists to make it idempotent
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_business_type_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_business_type_check 
CHECK (business_type IN ('general', 'restaurant', 'hamburgueria', 'pizzaria', 'acai', 'mercearia', 'farmacia', 'barbearia', 'salao', 'outros'));

-- Add index on business_type
CREATE INDEX IF NOT EXISTS idx_stores_business_type ON public.stores(business_type);

-- Add status column if it doesn't exist. We assume it might have been mocked as TEXT before.
-- This script ensures it's correctly defined.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='status') THEN
        ALTER TABLE public.stores ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;
END
$$;

-- Drop any old check constraints on status to replace it with the correct one.
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'public.stores'::regclass 
      AND conname LIKE 'stores_status_check%';
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.stores DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END;
$$;

-- Add the new, correct constraint for status.
ALTER TABLE public.stores ADD CONSTRAINT stores_status_check CHECK (status IN ('active', 'trial', 'suspended', 'blocked', 'deleted'));

-- Add index on status
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);


-- PART 2: Admin Access Control (RLS)

-- Helper function to check if the current user is a SaaS admin.
-- It checks the is_admin flag on the public.users table.
CREATE OR REPLACE FUNCTION is_saas_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- PART 3: Apply Global Read Policies for Admins

-- For stores: Admins can see all stores. Regular users can see their own (existing policy).
-- We add a new PERMISSIVE policy that grants access if is_saas_admin() is true.
CREATE POLICY "SaaS Admins can view all stores"
ON public.stores
FOR SELECT
TO authenticated
USING (is_saas_admin());


-- For customers: Admins can see all customers. Regular users can see their own (existing policy).
-- We add a new PERMISSIVE policy that grants access if is_saas_admin() is true.
CREATE POLICY "SaaS Admins can view all customers"
ON public.customers
FOR SELECT
TO authenticated
USING (is_saas_admin());
