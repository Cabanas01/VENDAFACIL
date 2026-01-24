'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import type { User, Store, Product, Sale, CashRegister } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  store: Store | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;

  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => Promise<void>;
  updateUser: (userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: AuthError | Error | null }>;

  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];

  setProducts: (action: React.SetStateAction<Product[]>) => Promise<void>;
  setSales: (action: React.SetStateAction<Sale[]>) => Promise<void>;
  setCashRegisters: (action: React.SetStateAction<CashRegister[]>) => Promise<void>;

  addSale: (sale: Omit<Sale, 'id' | 'store_id'>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Supabase client (pode ser null se faltar env vars)
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  const [products, setProductsState] = useState<Product[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const [loading, setLoading] = useState(true);

  /**
   * Busca store do usuário:
   * 1) se é dono (stores.user_id = userId)
   * 2) senão, vê store_members (store_members.user_id = userId) e carrega a store
   * 3) carrega membros via rpc('get_store_members') se existir
   * 4) carrega products/sales/cash_registers
   */
  const fetchStoreData = useCallback(
    async (userId: string) => {
      if (!supabase) return;

      console.log('[STORE] fetchStoreData', { userId });

      let storeDataResult: any = null;

      // 1) owner store
      const { data: ownedStore, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('[STORE] owned store result', { ownedStore, storeError });

      if (ownedStore) {
        storeDataResult = ownedStore;
      } else {
        // Se não achou e não é "no rows", loga
        if (storeError && storeError.code !== 'PGRST116') {
          console.error('[STORE] Error fetching owned store:', storeError);
        }

        // 2) member store
        const { data: memberData, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .single();

        console.log('[STORE] member store result', { memberData, memberError });

        if (memberError && memberError.code !== 'PGRST116') {
          console.error('[STORE] Error fetching member store:', memberError);
        }

        if (memberData?.store_id) {
          const { data: memberStoreData, error: memberStoreDataError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', memberData.store_id)
            .single();

          console.log('[STORE] store by member id result', { memberStoreData, memberStoreDataError });

          if (memberStoreDataError) {
            console.error('[STORE] Error fetching store by member id:', memberStoreDataError);
          } else {
            storeDataResult = memberStoreData;
          }
        }
      }

      if (!storeDataResult) {
        setStore(null);
        setProductsState([]);
        setSalesState([]);
        setCashRegistersState([]);
        return;
      }

      // 3) members via RPC (se não existir, só ignora)
      let membersData: any[] = [];
      try {
        const { data, error } = await supabase.rpc('get_store_members', {
          p_store_id: storeDataResult.id,
        });
        if (error) {
          console.error('[STORE] Error fetching store members (rpc get_store_members):', error);
        } else {
          membersData = data || [];
        }
      } catch (e) {
        console.warn('[STORE] get_store_members rpc not available or failed:', e);
      }

      const storeWithMembers = { ...storeDataResult, members: membersData };
      setStore(storeWithMembers as Store);

      // 4) fetch related data
      const [productsRes, salesRes, cashRes] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeDataResult.id),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeDataResult.id),
        supabase
          .from('cash_registers')
          .select('*')
          .eq('store_id', storeDataResult.id)
          .order('opened_at', { ascending: false }),
      ]);

      if (productsRes.error) console.error('[STORE] products fetch error', productsRes.error);
      if (salesRes.error) console.error('[STORE] sales fetch error', salesRes.error);
      if (cashRes.error) console.error('[STORE] cash_registers fetch error', cashRes.error);

      setProductsState(productsRes.data || []);
      setSalesState(salesRes.data || []);
      setCashRegistersState(cashRes.data || []);
    },
    [supabase]
  );

  /**
   * Handler único para:
   * - sessão inicial (getSession)
   * - mudanças de auth (onAuthStateChange)
   */
  const handleSession = useCallback(
    async (session: any) => {
      if (!supabase) return;

      console.log('[AUTH] handleSession start', {
        hasSession: !!session,
        userId: session?.user?.id,
      });

      const supabaseUser = session?.user;

      if (!supabaseUser) {
        setUser(null);
        setStore(null);
        setProductsState([]);
        setSalesState([]);
        setCashRegistersState([]);
        return;
      }

      // Carrega/cria profile em public.users
      let profile: any = null;

      try {
        const res = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        profile = res.data;

        console.log('[AUTH] profile result', { profile, profileError: res.error });

        if (res.error && res.error.code !== 'PGRST116') {
          console.error('[AUTH] Profile fetch error:', res.error);
        }

        if (!profile) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({ id: supabaseUser.id, email: supabaseUser.email });

          console.log('[AUTH] profile insert result', { insertError });

          if (insertError) {
            // ✅ NÃO DESLOGA: se faltar policy/tabela, mantém sessão e segue com fallback
            console.error('[AUTH] Error creating user profile:', insertError);
          } else {
            profile = {
              id: supabaseUser.id,
              email: supabaseUser.email!,
              name: undefined,
              avatar_url: undefined,
            };
          }
        }
      } catch (e) {
        // ✅ NÃO DESLOGA: mantém sessão e usa fallback
        console.error('[AUTH] Profile flow exception:', e);
      }

      const safeProfile =
        profile ??
        ({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: undefined,
          avatar_url: undefined,
        } as any);

      setUser(safeProfile as User);
      await fetchStoreData(supabaseUser.id);
    },
    [supabase, fetchStoreData]
  );

  // ✅ Bootstrap + Listener
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);

        // 1) bootstrap inicial
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('[AUTH] getSession error', error);

        if (!mounted) return;
        await handleSession(data?.session);
      } catch (e) {
        console.error('[AUTH] bootstrap error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    // 2) listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (!mounted) return;
          setLoading(true);
          await handleSession(session);
        } catch (e) {
          console.error('[AUTH] onAuthStateChange error', e);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, handleSession]);

  // Actions
  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: new Error('Supabase not configured') as any };
      return supabase.auth.signInWithPassword({ email, password });
    },
    [supabase]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: new Error('Supabase not configured') as any };

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : undefined,
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return { error: { ...error, message: 'E-mail já cadastrado.' } };
        }
        return { error };
      }

      return { error: null };
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    router.push('/login');
  }, [supabase, router]);

  const createStore = useCallback(
    async (storeData: any): Promise<Store | null> => {
      if (!supabase || !user) return null;

      const rpcParams = {
        p_name: storeData.name,
        p_legal_name: storeData.legal_name,
        p_cnpj: storeData.cnpj,
        p_address: storeData.address,
        p_phone: storeData.phone,
        p_timezone: storeData.timezone,
      };

      const { data: newStoreData, error } = await supabase
        .rpc('create_new_store', rpcParams)
        .select()
        .single();

      if (error) {
        console.error('[STORE] Error creating store:', error);
        return null;
      }

      setStore(newStoreData as Store);
      return newStoreData as Store;
    },
    [supabase, user]
  );

  const updateStore = useCallback(
    async (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => {
      if (!supabase || !store || !user) return;

      const { error } = await supabase
        .from('stores')
        .update(storeData)
        .eq('id', store.id);

      if (!error) {
        await fetchStoreData(user.id);
      } else {
        console.error('[STORE] updateStore error', error);
      }
    },
    [supabase, store, user, fetchStoreData]
  );

  const updateUser = useCallback(
    async (userData: Partial<Omit<User, 'id' | 'email'>>) => {
      if (!supabase || !user) return;

      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) console.error('[AUTH] updateUser error', error);
      if (data) setUser(data as User);
    },
    [supabase, user]
  );

  const removeStoreMember = useCallback(
    async (userId: string) => {
      if (!supabase || !store || !user) {
        return { error: new Error('Usuário ou loja não disponíveis') };
      }

      if (userId === store.user_id) {
        return { error: new Error('O proprietário da loja não pode ser removido.') };
      }

      const { error } = await supabase
        .from('store_members')
        .delete()
        .eq('user_id', userId)
        .eq('store_id', store.id);

      if (!error) {
        await fetchStoreData(user.id);
      } else {
        console.error('[STORE] removeStoreMember error', error);
      }

      return { error };
    },
    [supabase, store, user, fetchStoreData]
  );

  const addSale = useCallback(
    async (
      newSale: {
        created_at?: string;
        payment_method: 'cash' | 'pix' | 'card';
        total_cents: number;
        items: Array<{
          productId: string;
          product_name_snapshot: string;
          quantity: number;
          unit_price_cents: number;
          subtotal_cents: number;
        }>;
      }
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase || !store || !user) {
        return { ok: false, error: 'Sessão/loja não inicializada.' };
      }

      try {
        const created_at = newSale.created_at ?? new Date().toISOString();

        const { data: saleResult, error: saleError } = await supabase
          .from('sales')
          .insert([
            {
              store_id: store.id,
              created_at,
              payment_method: newSale.payment_method,
              total_cents: newSale.total_cents,
            },
          ])
          .select()
          .single();

        if (saleError || !saleResult) {
          console.error('[SALE] Error creating sale', saleError);
          return { ok: false, error: saleError?.message || 'Erro ao criar venda.' };
        }

        const saleItemsData = newSale.items.map((item) => ({
          sale_id: saleResult.id,
          product_id: item.productId,
          product_name_snapshot: item.product_name_snapshot,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          subtotal_cents: item.subtotal_cents,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsData);

        if (itemsError) {
          console.error('[SALE] Error creating sale items', itemsError);
          await supabase.from('sales').delete().eq('id', saleResult.id);
          return { ok: false, error: itemsError.message || 'Erro ao inserir itens.' };
        }

        // Atualiza estoque via RPC (se existir); falha aqui não invalida a venda
        try {
          await Promise.all(
            newSale.items.map((item) =>
              supabase.rpc('decrement_stock', {
                p_product_id: item.productId,
                p_quantity: item.quantity,
              })
            )
          );
        } catch (e) {
          console.warn('[SALE] decrement_stock rpc failed (ignored)', e);
        }

        await fetchStoreData(user.id);
        return { ok: true };
      } catch (e: any) {
        console.error('[SALE] Full sale creation process failed:', e);
        return { ok: false, error: e?.message || 'Falha inesperada ao criar venda.' };
      }
    },
    [supabase, store, user, fetchStoreData]
  );

  // Setters sync
  const setProducts = useCallback(
    async (action: React.SetStateAction<Product[]>) => {
      if (!supabase || !store || !user) return;

      const newProducts = typeof action === 'function' ? action(products) : action;

      for (const p of newProducts as any[]) {
        if (products.some((op) => op.id === p.id)) {
          const { id, ...updateData } = p;
          const finalUpdateData = { ...updateData, store_id: store.id };
          const { error } = await supabase
            .from('products')
            .update(finalUpdateData)
            .eq('id', id);

          if (error) console.error('[PRODUCT] update error', error);
        } else {
          const { error } = await supabase
            .from('products')
            .insert({ ...p, store_id: store.id });

          if (error) console.error('[PRODUCT] insert error', error);
        }
      }

      await fetchStoreData(user.id);
    },
    [supabase, store, user, products, fetchStoreData]
  );

  const setSales = useCallback(async () => {
    console.log('setSales is not implemented for Supabase backend.');
  }, []);

  const setCashRegisters = useCallback(
    async (action: React.SetStateAction<CashRegister[]>) => {
      if (!supabase || !user) return;

      const newCashRegisters =
        typeof action === 'function' ? action(cashRegisters) : action;

      const oldRegisterIds = new Set(cashRegisters.map((cr) => cr.id));

      for (const cr of newCashRegisters as any[]) {
        if (oldRegisterIds.has(cr.id)) {
          const { id, ...updateData } = cr;
          const { error } = await supabase
            .from('cash_registers')
            .update(updateData)
            .eq('id', id);

          if (error) console.error('[CASH] update error', error);
        } else {
          const { error } = await supabase
            .from('cash_registers')
            .insert(cr);

          if (error) console.error('[CASH] insert error', error);
        }
      }

      await fetchStoreData(user.id);
    },
    [supabase, user, cashRegisters, fetchStoreData]
  );

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    store,
    loading,
    login,
    signup,
    logout,
    createStore,
    updateStore,
    updateUser,
    removeStoreMember,
    products,
    sales,
    cashRegisters,
    setProducts,
    setSales,
    setCashRegisters,
    addSale,
  };

  // Se faltar env vars na Vercel, não quebra o app — exibe mensagem
  if (!supabase) {
    return (
      <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
        <b>Configuração do Supabase ausente.</b>
        <div>
          Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> na Vercel e faça Redeploy.
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
