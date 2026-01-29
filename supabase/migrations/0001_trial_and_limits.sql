-- 1. Add new columns to existing tables
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

ALTER TABLE public.store_access
ADD COLUMN IF NOT EXISTS limits JSONB,
ADD COLUMN IF NOT EXISTS features JSONB;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON public.sales(store_id);

-- 2. Create the RPC function to start a trial
CREATE OR REPLACE FUNCTION public.start_trial(p_store_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    store_owner_id UUID;
    is_trial_used BOOLEAN;
BEGIN
    -- Security Check: Ensure the user owns the store
    SELECT user_id, trial_used INTO store_owner_id, is_trial_used
    FROM public.stores
    WHERE id = p_store_id;

    IF store_owner_id IS NULL THEN
        RETURN json_build_object('success', false, 'reason', 'store_not_found');
    END IF;

    IF store_owner_id != p_user_id THEN
        RETURN json_build_object('success', false, 'reason', 'permission_denied');
    END IF;

    -- Idempotency Check: Don't start trial if already used
    IF is_trial_used = TRUE THEN
        RETURN json_build_object('success', false, 'reason', 'already_used');
    END IF;

    -- Grant trial access
    INSERT INTO public.store_access (
        store_id,
        plano_nome,
        plano_tipo,
        data_inicio_acesso,
        data_fim_acesso,
        status_acesso,
        origem,
        renovavel,
        limits,
        features
    )
    VALUES (
        p_store_id,
        'Trial',
        'free',
        NOW(),
        NOW() + INTERVAL '7 days',
        'ativo',
        'user_trial_request',
        FALSE,
        '{"max_sales": 5, "max_customers": 10}',
        '{"analytics_basic": true, "analytics_full": false, "export_users": false}'
    )
    ON CONFLICT (store_id) DO UPDATE SET
        plano_nome = EXCLUDED.plano_nome,
        plano_tipo = EXCLUDED.plano_tipo,
        data_inicio_acesso = EXCLUDED.data_inicio_acesso,
        data_fim_acesso = EXCLUDED.data_fim_acesso,
        status_acesso = EXCLUDED.status_acesso,
        origem = EXCLUDED.origem,
        renovavel = EXCLUDED.renovavel,
        limits = EXCLUDED.limits,
        features = EXCLUDED.features,
        updated_at = NOW();

    -- Mark trial as used on the store
    UPDATE public.stores
    SET trial_used = TRUE, trial_started_at = NOW()
    WHERE id = p_store_id;

    RETURN json_build_object('success', true);
END;
$$;


-- 3. Create Trigger function for customer limit
CREATE OR REPLACE FUNCTION public.check_customer_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    customer_count INT;
    max_customers INT;
    store_plan_type TEXT;
BEGIN
    -- Check if the store is on a 'free' plan
    SELECT sa.plano_tipo, (sa.limits->>'max_customers')::INT INTO store_plan_type, max_customers
    FROM public.store_access sa
    WHERE sa.store_id = NEW.store_id;

    IF store_plan_type = 'free' AND max_customers IS NOT NULL THEN
        -- Count current customers for the store
        SELECT count(*) INTO customer_count
        FROM public.customers
        WHERE store_id = NEW.store_id;

        -- Check if the limit is reached
        IF customer_count >= max_customers THEN
            RAISE EXCEPTION 'trial_customer_limit' USING HINT = 'Trial plan customer limit reached';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then create it
DROP TRIGGER IF EXISTS before_insert_customer_check_limit ON public.customers;
CREATE TRIGGER before_insert_customer_check_limit
BEFORE INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.check_customer_limit();


-- 4. Create Trigger function for sales limit
CREATE OR REPLACE FUNCTION public.check_sales_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    sales_count INT;
    max_sales INT;
    store_plan_type TEXT;
BEGIN
    -- Check if the store is on a 'free' plan
    SELECT sa.plano_tipo, (sa.limits->>'max_sales')::INT INTO store_plan_type, max_sales
    FROM public.store_access sa
    WHERE sa.store_id = NEW.store_id;

    IF store_plan_type = 'free' AND max_sales IS NOT NULL THEN
        -- Count current sales for the store
        SELECT count(*) INTO sales_count
        FROM public.sales
        WHERE store_id = NEW.store_id;

        -- Check if the limit is reached
        IF sales_count >= max_sales THEN
            RAISE EXCEPTION 'trial_sales_limit' USING HINT = 'Trial plan sales limit reached';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then create it
DROP TRIGGER IF EXISTS before_insert_sale_check_limit ON public.sales;
CREATE TRIGGER before_insert_sale_check_limit
BEFORE INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.check_sales_limit();
