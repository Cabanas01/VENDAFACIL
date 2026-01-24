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
import type { AuthError, Session } from '@supabase/supabase-js';
import type { User, Store, Product, Sale, CashRegister, StoreMember, CartItem, SaleItem, StoreStatus } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  store: Store | null;
  loading: boolean;
  storeStatus: StoreStatus;
  storeError: string | null;

  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error: any }>;

  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => Promise<void>;
  updateUser: (userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: AuthError | Error | null }>;

  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];
  
  addProduct: (productData: Omit<Product, 'id' | 'created_at' | 'store_id'>) => Promise<void>;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'created_at' | 'store_id'>>) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  updateProductStock: (productId: string, newStock: number) => Promise<void>;

  setSales: (action: React.SetStateAction<Sale[]>) => Promise<void>;
  setCashRegisters: (action: React.SetStateAction<CashRegister[]>) => Promise<void>;

  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProductsState] = useState<Product[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [storeError, setStoreError] = useState<string | null>(null);

  const fetchStoreData = useCallback(
    async (userId: string) => {
      if (!supabase) {
        setStoreStatus('error');
        setStoreError('Supabase client not available.');
        return;
      }

      setStoreStatus('loading');
      setStoreError(null);

      try {
        let storeDataResult: any = null;

        const { data: ownedStore, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (ownedStore) {
          storeDataResult = ownedStore;
        } else if (storeError && storeError.code !== 'PGRST116') {
          throw storeError;
        } else {
          const { data: memberData, error: memberError } = await supabase
            .from('store_members')
            .select('store_id')
            .eq('user_id', userId)
            .single();

          if (memberError && memberError.code !== 'PGRST116') {
            throw memberError;
          }

          if (memberData?.store_id) {
            const { data: memberStoreData, error: memberStoreDataError } = await supabase
              .from('stores')
              .select('*')
              .eq('id', memberData.store_id)
              .single();

            if (memberStoreDataError) throw memberStoreDataError;
            storeDataResult = memberStoreData;
          }
        }

        if (!storeDataResult) {
          setStore(null);
          setStoreStatus('none');
          setProductsState([]);
          setSalesState([]);
          setCashRegistersState([]);
          return;
        }

        let membersData: any[] = [];
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_store_members', {
          p_store_id: storeDataResult.id,
        });

        if (rpcError) {
          console.error('[STORE] Error fetching store members (rpc get_store_members):', rpcError);
        } else {
          membersData = rpcData || [];
        }

        const storeWithMembers = { ...storeDataResult, members: membersData };
        setStore(storeWithMembers as Store);
        setStoreStatus('has');

        const [productsRes, salesRes, cashRes] = await Promise.all([
          supabase.from('products').select('*').eq('store_id', storeDataResult.id),
          supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeDataResult.id).order('created_at', { ascending: false }),
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
      } catch (e: any) {
        console.error('[STORE] fetchStoreData error:', e);
        setStore(null);
        setStoreStatus('error');
        setStoreError(e.message || 'Falha ao carregar dados da loja.');
      }
    },
    [supabase]
  );
  
  const handleSession = useCallback(
    async (session: Session | null) => {
      if (!supabase) return;

      const supabaseUser = session?.user;

      try {
        if (!supabaseUser) {
          setUser(null);
          setStore(null);
          setStoreStatus('none');
          return;
        }

        const { data: profile, error } = await supabase.from('users').select('*').eq('id', supabaseUser.id).single();
        if (error && error.code !== 'PGRST116') {
             console.error('[AUTH] Profile fetch error:', error);
             throw error;
        }
        
        if (profile) {
            setUser(profile as User);
            await fetchStoreData(supabaseUser.id);
        } else {
             // This case should be handled by the trigger, but as a fallback:
             const { data: newProfile, error: insertError } = await supabase.from('users').insert({ id: supabaseUser.id, email: supabaseUser.email }).select().single();
             if (insertError) {
                 console.error('[AUTH] Profile insert error:', insertError);
                 throw insertError;
             }
             setUser(newProfile as User);
             await fetchStoreData(supabaseUser.id);
        }

      } catch (e: any) {
        console.error('[AUTH] Profile/Store flow error:', e);
        if (supabaseUser) {
          setUser({ id: supabaseUser.id, email: supabaseUser.email! } as User);
        }
        setStoreStatus('error');
        setStoreError(e.message || 'Falha ao carregar perfil ou loja.');
      }
    },
    [supabase, fetchStoreData]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setStoreStatus('error');
      setStoreError('Supabase client not available.');
      return;
    }

    let mounted = true;

    const run = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) await handleSession(data?.session);
      } catch (e) {
        console.error('[AUTH] bootstrap error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (mounted) {
          setLoading(true);
          await handleSession(session);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, handleSession]);

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
    setStoreStatus('none');
    setLoading(false);
    router.push('/login');
  }, [supabase, router]);

  const deleteAccount = useCallback(async () => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.rpc('delete_user_account');
    if (!error) {
        // force sign out and state clear
        await logout();
    }
    return { error };
  }, [supabase, logout]);

  const createStore = useCallback(
    async (storeData: any): Promise<Store | null> => {
      if (!supabase || !user) return null;

      try {
        const rpcParams = {
          p_name: storeData.name,
          p_legal_name: storeData.legal_name,
          p_cnpj: storeData.cnpj,
          p_address: storeData.address,
          p_phone: storeData.phone,
          p_timezone: storeData.timezone,
        };

        const { data, error } = await supabase.rpc('create_new_store', rpcParams);

        if (error) {
          console.error('[STORE] Error creating store:', error);
          setStoreStatus('error');
          setStoreError(error.message);
          return null;
        }

        const newStore = Array.isArray(data) ? data[0] : data;
        if (!newStore) {
          const msg = 'A criação da loja não retornou os dados esperados.';
          console.error(`[STORE] ${msg}`);
          setStoreStatus('error');
          setStoreError(msg);
          return null;
        }
        
        await fetchStoreData(user.id);
        
        return newStore as Store;
      } catch (e: any) {
        console.error('[STORE] createStore exception:', e);
        setStoreStatus('error');
        setStoreError(e?.message || 'Erro inesperado ao criar loja');
        return null;
      }
    },
    [supabase, user, fetchStoreData]
  );
  
  const updateStore = useCallback(
    async (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => {
      if (!supabase || !store || !user) return;
      const { error } = await supabase.from('stores').update(storeData).eq('id', store.id);
      if (!error) await fetchStoreData(user.id);
      else console.error('[STORE] updateStore error', error);
    },
    [supabase, store, user, fetchStoreData]
  );

  const updateUser = useCallback(
    async (userData: Partial<Omit<User, 'id' | 'email'>>) => {
      if (!supabase || !user) return;
      const { data, error } = await supabase.from('users').update(userData).eq('id', user.id).select().single();
      if (error) console.error('[AUTH] updateUser error', error);
      if (data) setUser(data as User);
    },
    [supabase, user]
  );
  
  const removeStoreMember = useCallback(
    async (userId: string) => {
      if (!supabase || !store || !user) return { error: new Error('Usuário ou loja não disponíveis') };
      if (userId === store.user_id) return { error: new Error('O proprietário da loja não pode ser removido.') };
      const { error } = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
      if (!error) await fetchStoreData(user.id);
      else console.error('[STORE] removeStoreMember error', error);
      return { error };
    },
    [supabase, store, user, fetchStoreData]
  );
  
  const addSale = useCallback(
    async (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => {
      if (!supabase || !store || !user) {
        throw new Error("Usuário ou loja não autenticados.");
      }
      if (!cart || cart.length === 0) {
        throw new Error("O carrinho não pode estar vazio.");
      }
  
      const total_cents = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);
      const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
      try {
        const { error: saleError } = await supabase.from('sales').insert({
          id: saleId,
          store_id: store.id,
          total_cents,
          payment_method,
        });
  
        if (saleError) {
          console.error('[SALE] Error creating sale', saleError);
          throw saleError;
        }
  
        // Sequentially insert sale items for better error handling
        for (const item of cart) {
          const { error: itemError } = await supabase.from('sale_items').insert({
            sale_id: saleId,
            product_id: item.product_id,
            product_name_snapshot: item.product_name_snapshot,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            subtotal_cents: item.subtotal_cents,
          });
  
          if (itemError) {
            console.error(`[SALE] Error creating sale item ${item.product_name_snapshot}, rolling back...`, itemError);
            await supabase.from('sales').delete().eq('id', saleId);
            throw itemError;
          }
        }
  
        const stockUpdatePromises = cart.map(item =>
          supabase.rpc('decrement_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          })
        );
  
        const stockUpdateResults = await Promise.all(stockUpdatePromises);
        const firstRpcError = stockUpdateResults.find(res => res.error);
  
        if (firstRpcError) {
          console.error('[SALE] Error during stock decrement, rolling back sale...', firstRpcError.error);
          await supabase.from('sale_items').delete().eq('sale_id', saleId);
          await supabase.from('sales').delete().eq('id', saleId);
          throw firstRpcError.error;
        }
  
        await fetchStoreData(user.id);
      } catch (error) {
        console.error('[SALE] Full sale creation process failed:', error);
        throw error;
      }
    },
    [supabase, store, user, fetchStoreData]
  );

  // --- Product Management ---
  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'created_at' | 'store_id'>) => {
      if (!supabase || !store || !user) throw new Error("Store not available");
      const { error } = await supabase.from('products').insert({ ...productData, store_id: store.id });
      if (error) {
          console.error('[PRODUCT] insert error', error);
          throw error;
      }
      await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);

  const updateProduct = useCallback(async (productId: string, productData: Partial<Product>) => {
      if (!supabase || !store || !user) throw new Error("Supabase not available");
      const { error } = await supabase.from('products').update(productData).eq('id', productId);
      if (error) {
          console.error('[PRODUCT] update error', error);
          throw error;
      }
      await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);
  
  const updateProductStock = useCallback(async (productId: string, newStock: number) => {
      if (!supabase || !store || !user) throw new Error("Supabase not available");
      const { error } = await supabase.from('products').update({ stock_qty: newStock }).eq('id', productId);
      if (error) {
          console.error('[PRODUCT] stock update error', error);
          throw error;
      }
      await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);

  const removeProduct = useCallback(async (productId: string) => {
      if (!supabase || !store || !user) throw new Error("Supabase not available");
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) {
          console.error('[PRODUCT] delete error', error);
          throw error;
      }
      await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);


  const setSales = useCallback(async () => {
    console.log('setSales is not implemented for Supabase backend.');
  }, []);

  const setCashRegisters = useCallback(
    async (action: React.SetStateAction<CashRegister[]>) => {
      if (!supabase || !user) return;
      const newCashRegisters = typeof action === 'function' ? action(cashRegisters) : action;
      const oldRegisterIds = new Set(cashRegisters.map((cr) => cr.id));
      for (const cr of newCashRegisters as any[]) {
        if (oldRegisterIds.has(cr.id)) {
          const { id, ...updateData } = cr;
          const { error } = await supabase.from('cash_registers').update(updateData).eq('id', id);
          if (error) console.error('[CASH] update error', error);
        } else {
          const { error } = await supabase.from('cash_registers').insert(cr);
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
    storeStatus,
    storeError,
    login,
    signup,
    logout,
    deleteAccount,
    createStore,
    updateStore,
    updateUser,
    removeStoreMember,
    products,
    sales,
    cashRegisters,
    addProduct,
    updateProduct,
    removeProduct,
    updateProductStock,
    setSales,
    setCashRegisters,
    addSale,
  };

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
