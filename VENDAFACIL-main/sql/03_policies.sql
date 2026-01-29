-- 1. Limpeza de Políticas Antigas
-- Remove as políticas das tabelas para garantir um estado limpo antes de recriar.
DROP POLICY IF EXISTS "Allow authenticated users to read their own user record" ON "public"."users";
DROP POLICY IF EXISTS "Allow members to read co-members profiles" ON "public"."users";
DROP POLICY IF EXISTS "Allow authenticated users to update their own user record" ON "public"."users";
DROP POLICY IF EXISTS "Allow users to insert their own user record" ON "public"."users";

DROP POLICY IF EXISTS "Allow store members to read store" ON "public"."stores";
DROP POLICY IF EXISTS "Allow store owners to update store" ON "public"."stores";
DROP POLICY IF EXISTS "Allow authenticated users to create stores" ON "public"."stores";

DROP POLICY IF EXISTS "Allow store owners to manage members" ON "public"."store_members";
DROP POLICY IF EXISTS "Allow members to view their own membership" ON "public"."store_members";

DROP POLICY IF EXISTS "Allow members to manage their store data" ON "public"."products";
DROP POLICY IF EXISTS "Allow members to manage their store data" ON "public"."sales";
DROP POLICY IF EXISTS "Allow members to manage their store data" ON "public"."cash_registers";
DROP POLICY IF EXISTS "Allow members to manage their store data" ON "public"."sale_items";


-- 2. Configuração de Segurança (Row Level Security - RLS)

-- Habilita RLS em todas as tabelas
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."store_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cash_registers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


-- Políticas para a Tabela: users
-- 1. Usuários podem ler o seu próprio perfil.
CREATE POLICY "Allow authenticated users to read their own user record" ON "public"."users"
    FOR SELECT USING (("auth"."uid"() = "id"));
-- 2. Membros de uma loja podem ler os perfis de outros membros da mesma loja.
CREATE POLICY "Allow members to read co-members profiles" ON "public"."users"
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_members m1
        JOIN public.store_members m2 ON m1.store_id = m2.store_id
        WHERE m1.user_id = auth.uid() AND m2.user_id = public.users.id
    ));
-- 3. Usuários podem atualizar o seu próprio perfil.
CREATE POLICY "Allow authenticated users to update their own user record" ON "public"."users"
    FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));
-- 4. Usuários autenticados podem criar o seu próprio perfil.
CREATE POLICY "Allow users to insert their own user record" ON "public"."users"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- Políticas para a Tabela: stores
-- 1. Membros podem ler os dados da loja da qual fazem parte.
CREATE POLICY "Allow store members to read store" ON "public"."stores"
    FOR SELECT USING (is_store_member(id, auth.uid()));
-- 2. Apenas proprietários podem atualizar os dados da loja.
CREATE POLICY "Allow store owners to update store" ON "public"."stores"
    FOR UPDATE USING (is_store_owner(id, auth.uid())) WITH CHECK (is_store_owner(id, auth.uid()));
-- 3. Qualquer usuário autenticado pode criar uma nova loja.
CREATE POLICY "Allow authenticated users to create stores" ON "public"."stores"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- Políticas para a Tabela: store_members
-- 1. Proprietários podem gerenciar (ver, adicionar, remover) membros da sua loja.
CREATE POLICY "Allow store owners to manage members" ON "public"."store_members"
    FOR ALL USING (is_store_owner(store_id, auth.uid()))
    WITH CHECK (is_store_owner(store_id, auth.uid()));
-- 2. Membros podem ver a sua própria linha de membresia (para saberem que pertencem a uma loja).
CREATE POLICY "Allow members to view their own membership" ON "public"."store_members"
    FOR SELECT USING (user_id = auth.uid());


-- Políticas para as Tabelas de Dados da Loja: products, sales, cash_registers, sale_items
-- 1. Membros podem realizar todas as operações (CRUD) nos dados da loja da qual fazem parte.
CREATE POLICY "Allow members to manage their store data" ON "public"."products"
    FOR ALL USING (is_store_member(store_id, auth.uid())) WITH CHECK (is_store_member(store_id, auth.uid()));
CREATE POLICY "Allow members to manage their store data" ON "public"."sales"
    FOR ALL USING (is_store_member(store_id, auth.uid())) WITH CHECK (is_store_member(store_id, auth.uid()));
CREATE POLICY "Allow members to manage their store data" ON "public"."cash_registers"
    FOR ALL USING (is_store_member(store_id, auth.uid())) WITH CHECK (is_store_member(store_id, auth.uid()));
CREATE POLICY "Allow members to manage their store data" ON "public"."sale_items"
    FOR ALL USING ((SELECT is_store_member(s.store_id, auth.uid()) FROM "public"."sales" s WHERE s.id = sale_id))
    WITH CHECK ((SELECT is_store_member(s.store_id, auth.uid()) FROM "public"."sales" s WHERE s.id = sale_id));
