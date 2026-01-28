-- PARTE 1: REMOÇÃO DO MODELO DE DADOS ANTIGO (ENTITLEMENTS)
DROP TABLE IF EXISTS public.subscription_events;
DROP TABLE IF EXISTS public.entitlements;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.plans;
DROP TYPE IF EXISTS public.subscription_status;


-- PARTE 2: CRIAÇÃO DO NOVO MODELO DE DADOS (store_access)
CREATE TABLE IF NOT EXISTS public.store_access (
    store_id UUID PRIMARY KEY NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    plano_nome TEXT NOT NULL,
    plano_tipo TEXT NOT NULL CHECK (plano_tipo IN ('trial', 'semanal', 'mensal', 'anual', 'vitalicio')),
    data_inicio_acesso TIMESTAMPTZ NOT NULL,
    data_fim_acesso TIMESTAMPTZ NOT NULL,
    status_acesso TEXT NOT NULL CHECK (status_acesso IN ('ativo', 'expirado', 'bloqueado', 'aguardando_liberacao')),
    origem TEXT,
    renovavel BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.store_access IS 'Fonte de verdade única para controle de acesso de cada loja.';
COMMENT ON COLUMN public.store_access.status_acesso IS 'Status do acesso: ativo, expirado, bloqueado, aguardando_liberacao';
COMMENT ON COLUMN public.store_access.data_fim_acesso IS 'Data em que o acesso da loja expira.';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_store_access_status ON public.store_access(status_acesso);
CREATE INDEX IF NOT EXISTS idx_store_access_data_fim ON public.store_access(data_fim_acesso);


-- PARTE 3: POLÍTICAS DE SEGURANÇA (RLS) PARA store_access
ALTER TABLE public.store_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own store access status" ON public.store_access;
DROP POLICY IF EXISTS "Admins can manage all store access" ON public.store_access;

-- Política para usuários autenticados lerem o status de acesso de suas lojas
CREATE POLICY "Users can read their own store access status"
ON public.store_access
FOR SELECT
TO authenticated
USING (is_store_member(store_id));

-- Política para administradores do SaaS gerenciarem todos os registros de acesso
CREATE POLICY "Admins can manage all store access"
ON public.store_access
FOR ALL
TO authenticated
USING (is_saas_admin())
WITH CHECK (is_saas_admin());


-- PARTE 4: ATUALIZAÇÃO DA FUNÇÃO DE CRIAÇÃO DE LOJA
-- Esta função agora também cria um registro de trial de 2 dias na tabela store_access
CREATE OR REPLACE FUNCTION public.create_new_store(
    p_name TEXT,
    p_legal_name TEXT,
    p_cnpj TEXT,
    p_address JSONB,
    p_phone TEXT,
    p_timezone TEXT
)
RETURNS TABLE (id UUID, user_id UUID, name TEXT, cnpj TEXT, legal_name TEXT, address JSONB, phone TEXT, timezone TEXT, settings JSONB, business_type TEXT, status TEXT) AS $$
DECLARE
    new_store_id UUID;
BEGIN
    -- Inserir a nova loja na tabela stores
    INSERT INTO public.stores (user_id, name, legal_name, cnpj, address, phone, timezone)
    VALUES (auth.uid(), p_name, p_legal_name, p_cnpj, p_address, p_phone, p_timezone)
    RETURNING stores.id INTO new_store_id;

    -- Inserir o registro de membro para o proprietário
    INSERT INTO public.store_members (store_id, user_id, role)
    VALUES (new_store_id, auth.uid(), 'admin');
    
    -- Inserir o registro de acesso de trial de 2 dias
    INSERT INTO public.store_access (store_id, plano_nome, plano_tipo, data_inicio_acesso, data_fim_acesso, status_acesso, origem, renovavel)
    VALUES (new_store_id, 'Trial 2 Dias', 'trial', now(), now() + interval '2 days', 'ativo', 'onboarding', false);

    -- Retornar os detalhes da loja criada
    RETURN QUERY SELECT s.id, s.user_id, s.name, s.cnpj, s.legal_name, s.address, s.phone, s.timezone, s.settings, s.business_type, s.status FROM public.stores s WHERE s.id = new_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PARTE 5: FUNÇÕES RPC PARA ACESSO E ADMINISTRAÇÃO

-- Função para o frontend verificar o status de acesso de forma segura e centralizada
CREATE OR REPLACE FUNCTION public.get_store_access_status(p_store_id UUID)
RETURNS TABLE (
    acesso_liberado BOOLEAN,
    data_fim_acesso TIMESTAMPTZ,
    plano_nome TEXT,
    mensagem TEXT
) AS $$
DECLARE
    access_record public.store_access%ROWTYPE;
BEGIN
    -- Seleciona o registro de acesso para a loja especificada
    SELECT * INTO access_record FROM public.store_access WHERE store_id = p_store_id;

    -- Se não houver registro, retorna um estado de erro/padrão
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 'N/A', 'Acesso não configurado para esta loja. Entre em contato com o suporte.';
        RETURN;
    END IF;

    -- Verifica se o acesso expirou e atualiza o status se necessário
    IF access_record.status_acesso = 'ativo' AND access_record.data_fim_acesso < now() THEN
        UPDATE public.store_access
        SET status_acesso = 'expirado', updated_at = now()
        WHERE store_id = p_store_id;
        
        -- Recarrega o registro atualizado
        SELECT * INTO access_record FROM public.store_access WHERE store_id = p_store_id;
    END IF;

    -- Define a mensagem e o status de liberação com base no status do acesso
    CASE access_record.status_acesso
        WHEN 'ativo' THEN
            acesso_liberado := TRUE;
            mensagem := 'Seu plano ' || access_record.plano_nome || ' está ativo até ' || to_char(access_record.data_fim_acesso, 'DD/MM/YYYY') || '.';
        WHEN 'aguardando_liberacao' THEN
            acesso_liberado := FALSE;
            mensagem := 'Seu pagamento foi confirmado. Seu acesso será liberado em breve.';
        WHEN 'expirado' THEN
            acesso_liberado := FALSE;
            mensagem := 'Seu acesso expirou em ' || to_char(access_record.data_fim_acesso, 'DD/MM/YYYY') || '. Para continuar, escolha um plano.';
        WHEN 'bloqueado' THEN
            acesso_liberado := FALSE;
            mensagem := 'Seu acesso foi bloqueado. Entre em contato com o suporte.';
        ELSE
            acesso_liberado := FALSE;
            mensagem := 'Status de acesso desconhecido. Entre em contato com o suporte.';
    END CASE;

    -- Retorna o resultado
    RETURN QUERY SELECT 
        acesso_liberado,
        access_record.data_fim_acesso,
        access_record.plano_nome,
        mensagem;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função para o admin conceder acesso a uma loja
CREATE OR REPLACE FUNCTION public.admin_grant_store_access(
    p_store_id UUID,
    p_plano_nome TEXT,
    p_plano_tipo TEXT,
    p_duracao_dias INTEGER,
    p_origem TEXT DEFAULT 'manual',
    p_renovavel BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
    IF NOT is_saas_admin() THEN
        RAISE EXCEPTION 'Apenas administradores podem executar esta função.';
    END IF;

    INSERT INTO public.store_access (
        store_id,
        plano_nome,
        plano_tipo,
        data_inicio_acesso,
        data_fim_acesso,
        status_acesso,
        origem,
        renovavel
    )
    VALUES (
        p_store_id,
        p_plano_nome,
        p_plano_tipo,
        now(),
        now() + (p_duracao_dias || ' days')::INTERVAL,
        'ativo',
        p_origem,
        p_renovavel
    )
    ON CONFLICT (store_id) DO UPDATE SET
        plano_nome = EXCLUDED.plano_nome,
        plano_tipo = EXCLUDED.plano_tipo,
        data_inicio_acesso = EXCLUDED.data_inicio_acesso,
        data_fim_acesso = EXCLUDED.data_fim_acesso,
        status_acesso = EXCLUDED.status_acesso,
        origem = EXCLUDED.origem,
        renovavel = EXCLUDED.renovavel,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
