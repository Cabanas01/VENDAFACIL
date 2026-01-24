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
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id'>>) => Promise<void>;
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

  // ✅ pega o client uma vez (pode ser null se faltar env)
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);

  const [loading, setLoading] = useState(true);

  const fetchStoreData = useCallback(
    async (userId: string) => {
      if (!supabase) return;

      // Try to find a store where the user is the owner
      let { data: storeDataResult, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', userId)
        .single();

      // If not an owner, check if they are a member of another store
      if (!storeDataResult && storeError?.code !== 'PGRST116') {
        console.error('Error fetching owned store:', storeError);
      }

      if (!storeDataResult) {
        const { data: memberData, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .single();

        if (memberError && memberError.code !== 'PGRST116') {
          console.error('Error fetching member store:', memberError);
        }

        if (memberData) {
          const { data: memberStoreData, error: memberStoreDataError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', memberData.store_id)
            .single();

          if (memberStoreDataError) {
            console.error('Error fetching store by member id:', memberStoreDataError);
          }

          storeDataResult = memberStoreData;
        }
      }

      if (storeDataResult) {
        const { data: membersData, error: membersError } = await supabase.rpc(
          'get_store_members',
          { p_store_id: storeDataResult.id }
        );

        if (membersError) {
          console.error('Error fetching store members:', membersError);
        }

        const storeWithMembers = { ...storeDataResult, members: membersData || [] };
        setStore(storeWithMembers as Store);

        const [productsRes, salesRes, cashRes] = await Promise.all([
          supabase.from('products').select('*').eq('store_id', storeDataResult.id),
          supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeDataResult.id),
          supabase
            .from('cash_registers')
            .select('*')
            .eq('store_id', storeDataResult.id)
            .order('opened_at', { ascending: false }),
        ]);

        setProducts(productsRes.data || []);
        setSales(salesRes.data || []);
        setCashRegisters(cashRes.data || []);
      } else {
        setStore(null);
        setProducts([]);
        setSales([]);
        setCashRegisters([]);
      }
    },
    [supabase]
  );

 useEffect(() => {
  if (!supabase) {
    setLoading(false);
    return;
  }

  let mounted = true;

  const handleSession = async (session: any) => {
    try {
      if (!mounted) return;
      setLoading(true);

      const supabaseUser = session?.user;

      if (supabaseUser) {
        let { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        // Log útil caso RLS/policy esteja bloqueando
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
        }

        if (!profile) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({ id: supabaseUser.id, email: supabaseUser.email });

          if (insertError) {
            console.error('Error creating user profile:', insertError);
            await supabase.auth.signOut();
            profile = null;
          } else {
            profile = {
              id: supabaseUser.id,
              email: supabaseUser.email!,
              name: undefined,
              avatar_url: undefined,
            };
          }
        }

        if (!mounted) return;
        setUser(profile);

        if (profile) {
          await fetchStoreData(supabaseUser.id);
        }
      } else {
        if (!mounted) return;
        setUser(null);
        setStore(null);
        setProducts([]);
        setSales([]);
        setCashRegisters([]);
      }
    } catch (e) {
      console.error('Error handling session', e);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  // ✅ BOOTSTRAP INICIAL (isso faltava)
  (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error('getSession error:', error);
    await handleSession(data?.session);
  })();

  // ✅ LISTENER
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      await handleSession(session);
    }
  );

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, [supabase, fetchStoreData]);


  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: new Error('Supabase not configured') as any };
      return supabase.auth.signInWithPassword({ email, password });
    },
    [supabase]
  );

 const signup = useCallback(async (email: string, password: string) => {
  if (!supabase) return { error: new Error('Supabase not configured') as any };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_SITE_URL
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
}, [supabase]);

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
        console.error('Error creating store:', error);
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

      const { error } = await supabase.from('stores').update(storeData).eq('id', store.id);
      if (!error) {
        await fetchStoreData(user.id);
      }
    },
    [supabase, store, user, fetchStoreData]
  );

  const updateUser = useCallback(
    async (userData: Partial<Omit<User, 'id' | 'email'>>) => {
      if (!supabase || !user) return;

      const { data } = await supabase
        .from('users')
        .update(userData)
        .eq('id', user.id)
        .select()
        .single();

      if (data) setUser(data);
    },
    [supabase, user]
  );

  const removeStoreMember = useCallback(
    async (userId: string) => {
      if (!supabase || !store || !user) return { error: new Error('Usuário ou loja não disponíveis') };

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
      }
      return { error };
    },
    [supabase, store, user, fetchStoreData]
  );

  const addSale = useCallback(
    async (newSale: Omit<Sale, 'id' | 'store_id'>) => {
      if (!supabase || !store) return;

      const { items, ...saleData } = newSale;

      const { data: saleResult, error: saleError } = await supabase
        .from('sales')
        .insert([{ ...saleData, store_id: store.id }])
        .select()
        .single();

      if (saleError || !saleResult) {
        console.error('Error creating sale', saleError);
        return;
      }

      const saleItemsData = items.map((item) => ({
        ...item,
        sale_id: saleResult.id,
        productId: item.productId,
      }));

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsData).select();

      if (itemsError) {
        console.error('Error creating sale items', itemsError);
        return;
      }

      const stockUpdates = items.map((item) =>
        supabase.rpc('decrement_stock', {
          p_product_id: item.productId,
          p_quantity: item.quantity,
        })
      );
      await Promise.all(stockUpdates);

      await fetchStoreData(store.user_id);
    },
    [supabase, store, fetchStoreData]
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
    setProducts: async (action) => {
      if (!supabase || !store || !user) return;

      const newProducts = typeof action === 'function' ? action(products) : action;

      for (const p of newProducts) {
        if (products.some((op) => op.id === p.id)) {
          const { id, ...updateData } = p;
          const finalUpdateData = { ...updateData, store_id: store.id };
          await supabase.from('products').update(finalUpdateData).eq('id', id);
        } else {
          await supabase.from('products').insert({ ...p, store_id: store.id });
        }
      }

      await fetchStoreData(user.id);
    },
    setSales: async () => {
      console.log('setSales is not implemented for Supabase backend.');
    },
    setCashRegisters: async (action) => {
      if (!supabase || !user) return;

      const newCashRegisters = typeof action === 'function' ? action(cashRegisters) : action;
      const oldRegisterIds = new Set(cashRegisters.map((cr) => cr.id));

      for (const cr of newCashRegisters) {
        if (oldRegisterIds.has(cr.id)) {
          const { id, ...updateData } = cr;
          await supabase.from('cash_registers').update(updateData).eq('id', id);
        } else {
          await supabase.from('cash_registers').insert(cr);
        }
      }

      await fetchStoreData(user.id);
    },
    addSale,
  };

  // ✅ Se faltar env vars na Vercel, não quebra o app — mostra mensagem
  if (!supabase) {
    return (
      <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
        <b>Configuração do Supabase ausente.</b>
        <div>
          Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> na Vercel
          (Project → Settings → Environment Variables) e faça Redeploy.
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
