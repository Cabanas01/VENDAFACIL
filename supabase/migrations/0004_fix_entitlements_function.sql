-- supabase/migrations/0004_fix_entitlements_function.sql

-- This function replaces the previous version to ensure it exists and is robust.
-- It fetches the entitlements for a given store, defaulting to a 'free' plan if no subscription is found.
CREATE OR REPLACE FUNCTION public.get_store_entitlements(p_store_id uuid)
RETURNS TABLE (
    store_id uuid,
    plan_id text,
    is_paying boolean,
    access_until timestamptz,
    features jsonb,
    limits jsonb,
    updated_at timestamptz
) AS $$
DECLARE
    v_sub public.subscriptions%ROWTYPE;
    v_plan public.plans%ROWTYPE;
    v_access_until timestamptz;
BEGIN
    -- Find the most relevant subscription (active, trialing, or most recent expired)
    SELECT * INTO v_sub
    FROM public.subscriptions s
    WHERE s.store_id = p_store_id
    ORDER BY
        CASE s.status
            WHEN 'active' THEN 1
            WHEN 'trialing' THEN 2
            WHEN 'past_due' THEN 3
            ELSE 4
        END,
        s.current_period_end DESC
    LIMIT 1;

    -- If no subscription is found, create a default 'free' entitlement.
    IF v_sub.id IS NULL THEN
        SELECT * INTO v_plan FROM public.plans WHERE id = 'free';
        
        -- Check if an entitlement record already exists to determine the correct access_until date
        SELECT e.access_until INTO v_access_until
        FROM public.entitlements e
        WHERE e.store_id = p_store_id;

        -- If no entitlement record exists, set access for 24h from now. Otherwise, keep the existing date.
        IF v_access_until IS NULL THEN
            v_access_until := now() + interval '24 hours';
        END IF;

        RETURN QUERY
        SELECT
            p_store_id,
            'free'::text,
            false,
            v_access_until,
            v_plan.features,
            v_plan.limits,
            now();
        RETURN;
    END IF;

    -- If a subscription exists, find its plan
    SELECT * INTO v_plan
    FROM public.plans p
    WHERE p.id = v_sub.plan_id;

    -- Determine access_until date
    IF v_sub.status = 'trialing' AND v_sub.trial_ends_at IS NOT NULL THEN
        v_access_until := v_sub.trial_ends_at;
    ELSE
        v_access_until := v_sub.current_period_end;
    END IF;

    -- Return the calculated entitlements
    RETURN QUERY
    SELECT
        p_store_id,
        v_sub.plan_id,
        (v_sub.status = 'active' OR (v_sub.status = 'trialing' AND v_sub.trial_ends_at > now())),
        v_access_until,
        v_plan.features,
        v_plan.limits,
        now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_store_entitlements(uuid) TO authenticated;
