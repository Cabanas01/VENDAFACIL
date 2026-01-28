-- PARTE 4 - SQL
-- This script is idempotent and can be run multiple times.

-- 1. Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id TEXT PRIMARY KEY,
    store_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_agent TEXT NULL,
    ip TEXT NULL,
    device_type TEXT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_store FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_store_started_at ON public.user_sessions(store_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_store_user_last_seen ON public.user_sessions(store_id, user_id, last_seen_at DESC);


-- 2. Create user_events table
CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_group TEXT NOT NULL DEFAULT 'analytics',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_store FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes for user_events
CREATE INDEX IF NOT EXISTS idx_user_events_store_created_at ON public.user_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_store_event_name_created_at ON public.user_events(store_id, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_store_user_created_at ON public.user_events(store_id, user_id, created_at DESC);

-- 3. Partial unique index for 'unique_click'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_class c
        JOIN   pg_namespace n ON n.oid = c.relnamespace
        WHERE  c.relname = 'idx_unique_click_per_day_target'
        AND    n.nspname = 'public'
    ) THEN
        CREATE UNIQUE INDEX idx_unique_click_per_day_target
        ON public.user_events (store_id, user_id, (date_trunc('day', created_at)), (metadata->>'target'))
        WHERE event_name = 'unique_click';
    END IF;
END;
$$;


-- 4. RLS Policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own store sessions" ON public.user_sessions;
CREATE POLICY "Users can manage their own store sessions"
ON public.user_sessions
FOR ALL
TO authenticated
USING (is_store_member(store_id));

DROP POLICY IF EXISTS "SaaS Admins can read all sessions" ON public.user_sessions;
CREATE POLICY "SaaS Admins can read all sessions"
ON public.user_sessions
AS PERMISSIVE FOR SELECT
TO authenticated
USING (is_saas_admin());

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own store events" ON public.user_events;
CREATE POLICY "Users can manage their own store events"
ON public.user_events
FOR ALL
TO authenticated
USING (is_store_member(store_id));

DROP POLICY IF EXISTS "SaaS Admins can read all events" ON public.user_events;
CREATE POLICY "SaaS Admins can read all events"
ON public.user_events
AS PERMISSIVE FOR SELECT
TO authenticated
USING (is_saas_admin());


-- 5. RPC for unique click registration
CREATE OR REPLACE FUNCTION public.rpc_register_unique_click(
  p_store_id uuid,
  p_target text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_session_id text,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  inserted_id uuid;
BEGIN
    INSERT INTO public.user_events(store_id, user_id, session_id, event_name, event_group, metadata)
    VALUES (p_store_id, p_user_id, p_session_id, 'unique_click', 'analytics', p_metadata || jsonb_build_object('target', p_target))
    ON CONFLICT (store_id, user_id, (date_trunc('day', created_at)), (metadata->>'target')) WHERE event_name = 'unique_click'
    DO NOTHING
    RETURNING id INTO inserted_id;

    RETURN inserted_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;


-- 6. RPC for analytics summary
CREATE OR REPLACE FUNCTION public.rpc_analytics_summary(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS json AS $$
DECLARE
  summary_data json;
BEGIN
  SELECT
    json_build_object(
      'total_profile_views', COUNT(*) FILTER (WHERE event_name = 'profile_view'),
      'total_unique_clicks', COUNT(*) FILTER (WHERE event_name = 'unique_click'),
      'total_reports_opened', COUNT(*) FILTER (WHERE event_name = 'report_opened'),
      'total_events', COUNT(*),
      'top_event_names', (
        SELECT json_agg(top_events)
        FROM (
            SELECT event_name, COUNT(*) as count
            FROM public.user_events
            WHERE
                store_id = p_store_id AND
                created_at >= p_from AND
                created_at <= p_to
            GROUP BY event_name
            ORDER BY count DESC
            LIMIT 5
        ) AS top_events
      ),
      'events_by_day', (
        SELECT json_agg(daily_counts)
        FROM (
            SELECT
                date_trunc('day', created_at)::date AS day,
                COUNT(*) as count
            FROM public.user_events
            WHERE
                store_id = p_store_id AND
                created_at >= p_from AND
                created_at <= p_to
            GROUP BY day
            ORDER BY day
        ) AS daily_counts
      )
    )
  INTO summary_data
  FROM
    public.user_events
  WHERE
    store_id = p_store_id AND
    created_at >= p_from AND
    created_at <= p_to;

  RETURN summary_data;
END;
$$ LANGUAGE plpgsql;
