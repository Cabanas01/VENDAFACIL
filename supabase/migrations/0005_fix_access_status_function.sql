-- This script replaces the existing function with a more robust version.
-- It now uses a LEFT JOIN to ensure it always returns a single row for a valid store,
-- even if no 'store_access' record exists, preventing an empty result set.

CREATE OR REPLACE FUNCTION public.get_store_access_status(p_store_id uuid)
RETURNS TABLE(acesso_liberado boolean, data_fim_acesso timestamptz, plano_nome text, mensagem text)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Using a record type to hold the result of the join
    status_info RECORD;
    effective_status TEXT;
BEGIN
    -- RLS is applied here because the function is SECURITY INVOKER by default.
    -- This query will always return exactly one row for a valid store_id the user can see,
    -- because of the LEFT JOIN.
    SELECT
        s.id as store_id,
        sa.plano_nome,
        sa.data_fim_acesso,
        sa.status_acesso
    INTO status_info
    FROM public.stores s
    LEFT JOIN public.store_access sa ON s.id = sa.store_id
    WHERE s.id = p_store_id;

    -- If store_id is NULL, it means the user doesn't have RLS permission to see the store.
    IF status_info.store_id IS NULL THEN
        RETURN QUERY SELECT false, NULL, 'Acesso Negado', 'Você não tem permissão para ver o status desta loja.';
        RETURN;
    END IF;

    -- Determine the effective status
    effective_status := status_info.status_acesso;

    -- If no access record was found, treat as 'sem_plano'
    IF effective_status IS NULL THEN
        effective_status := 'sem_plano';
    END IF;

    -- If active plan has expired, update it and change the effective status for this run.
    IF effective_status = 'ativo' AND status_info.data_fim_acesso < now() THEN
        UPDATE public.store_access SET status_acesso = 'expirado' WHERE store_id = p_store_id;
        effective_status := 'expirado';
    END IF;

    -- Build the response based on the effective status
    CASE effective_status
        WHEN 'ativo' THEN
            RETURN QUERY SELECT true, status_info.data_fim_acesso, status_info.plano_nome, 'Seu acesso está ativo até ' || to_char(status_info.data_fim_acesso, 'DD/MM/YYYY') || '.';
        WHEN 'aguardando_liberacao' THEN
            RETURN QUERY SELECT false, status_info.data_fim_acesso, status_info.plano_nome, 'Seu pagamento foi confirmado. O acesso será liberado em breve.';
        WHEN 'bloqueado' THEN
            RETURN QUERY SELECT false, status_info.data_fim_acesso, status_info.plano_nome, 'Seu acesso foi bloqueado. Entre em contato com o suporte.';
        WHEN 'expirado' THEN
            RETURN QUERY SELECT false, status_info.data_fim_acesso, status_info.plano_nome, 'Seu acesso expirou. Renove seu plano para continuar.';
        ELSE -- This handles 'sem_plano' and any other unknown status
            RETURN QUERY SELECT false, NULL, 'Sem Plano', 'Nenhuma assinatura encontrada para esta loja. Contrate um plano para começar.';
    END CASE;
END;
$$;
