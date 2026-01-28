-- Part 1: user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id TEXT PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_agent TEXT NULL,
    ip TEXT NULL,
    device_type TEXT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_sessions_store_id_started_at ON public.user_sessions(store_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_store_id_user_id_last_seen_at ON public.user_sessions(store_id, user_id, last_seen_at DESC);

-- RLS for user_sessions
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions
FOR ALL
TO authenticated
USING (store_id IN (SELECT store_id FROM public.store_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "SaaS Admins can view all sessions" ON public.user_sessions;
CREATE POLICY "SaaS Admins can view all sessions"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (is_saas_admin());


-- Part 2: user_events table
CREATE TABLE IF NOT EXISTS public.user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    event_group TEXT NOT NULL DEFAULT 'analytics',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_events_store_id_created_at ON public.user_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_store_id_event_name_created_at ON public.user_events(store_id, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_store_id_user_id_created_at ON public.user_events(store_id, user_id, created_at DESC);

-- RLS for user_events
DROP POLICY IF EXISTS "Users can manage their own events" ON public.user_events;
CREATE POLICY "Users can manage their own events"
ON public.user_events
FOR ALL
TO authenticated
USING (store_id IN (SELECT store_id FROM public.store_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "SaaS Admins can view all events" ON public.user_events;
CREATE POLICY "SaaS Admins can view all events"
ON public.user_events
FOR SELECT
TO authenticated
USING (is_saas_admin());


-- Part 3: Unique click implementation
-- We need a unique index on the target within the metadata JSONB
DROP INDEX IF EXISTS unique_click_per_day;
CREATE UNIQUE INDEX unique_click_per_day
ON public.user_events (store_id, user_id, (date_trunc('day', created_at)), (metadata->>'target'))
WHERE event_name = 'unique_click';

-- RPC to register a unique click without raising an error on conflict.
CREATE OR REPLACE FUNCTION public.rpc_register_unique_click(
    p_store_id uuid,
    p_session_id text,
    p_target text,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_events (store_id, user_id, session_id, event_name, metadata)
    VALUES (
        p_store_id,
        auth.uid(),
        p_session_id,
        'unique_click',
        jsonb_set(p_metadata, '{target}', to_jsonb(p_target))
    )
    ON CONFLICT ((store_id), (user_id), (date_trunc('day', created_at)), (metadata->>'target')) WHERE event_name = 'unique_click'
    DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Part 4: Analytics Summary RPC
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_profile_views', (SELECT count(*) FROM public.user_events WHERE store_id = p_store_id AND event_name = 'profile_view' AND created_at BETWEEN p_from AND p_to),
        'total_unique_clicks', (SELECT count(*) FROM public.user_events WHERE store_id = p_store_id AND event_name = 'unique_click' AND created_at BETWEEN p_from AND p_to),
        'total_reports_opened', (SELECT count(*) FROM public.user_events WHERE store_id = p_store_id AND event_name = 'report_opened' AND created_at BETWEEN p_from AND p_to),
        'total_events', (SELECT count(*) FROM public.user_events WHERE store_id = p_store_id AND created_at BETWEEN p_from AND p_to),
        'top_event_names', (
            SELECT coalesce(json_agg(t), '[]'::json)
            FROM (
                SELECT event_name, count(*) as count
                FROM public.user_events
                WHERE store_id = p_store_id AND created_at BETWEEN p_from AND p_to
                GROUP BY event_name
                ORDER BY count DESC
                LIMIT 5
            ) t
        ),
        'events_by_day', (
            SELECT coalesce(json_agg(t ORDER BY t.day), '[]'::json)
            FROM (
                 SELECT
                    to_char(day_series.day, 'YYYY-MM-DD') AS day,
                    coalesce(daily_counts.count, 0) AS count
                FROM
                    generate_series(
                        date_trunc('day', p_from),
                        date_trunc('day', p_to),
                        '1 day'::interval
                    ) AS day_series(day)
                LEFT JOIN (
                    SELECT
                        date_trunc('day', created_at) AS day,
                        count(*) AS count
                    FROM
                        public.user_events
                    WHERE
                        store_id = p_store_id AND created_at BETWEEN p_from AND p_to
                    GROUP BY
                        1
                ) AS daily_counts ON day_series.day = daily_counts.day
            ) t
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
