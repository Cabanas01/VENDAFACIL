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
import type { User, Store, Product, Sale, CashRegister, SaleItem, CartItem, StoreStatus } from '@/lib/types';

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
  deleteAccount: () => Promise<{ error: AuthError | null }>;

  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => Promise<void>;
  updateUser: (userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: AuthError | Error | null }>;

  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];

  addProduct: (productData: Omit<Product, 'id' | 'store_id' | 'created_at'>) => Promise<void>;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'store_id' | 'created_at'>>) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  updateProductStock: (productId: string, newStock: number) => Promise<void>;

  setSales: (action: React.SetStateAction<Sale[]>) => Promise<void>;
  setCashRegisters: (action: React.SetStateAction<CashRegister[]>) => Promise<void>;

  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<{ ok: boolean; error?: string }>;
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
      if (!supabase) return;
      
      setStoreStatus('loading');
      setStoreError(null);

      try {
        const { data: ownedStore, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (storeError && storeError.code !== 'PGRST116') {
            throw new Error(`Erro ao buscar loja: ${storeError.message}. Verifique as permissões (RLS) da tabela 'stores'.`);
        }

        let storeDataResult: any = ownedStore;

        if (!storeDataResult) {
            const { data: memberData, error: memberError } = await supabase
                .from('store_members')
                .select('store_id')
                .eq('user_id', userId)
                .maybeSingle();

            if (memberError && memberError.code !== 'PGRST116') {
                 throw new Error(`Erro ao buscar vínculo: ${memberError.message}. Verifique as permissões (RLS) da tabela 'store_members'.`);
            }
            
            if (memberData?.store_id) {
                const { data: memberStoreData, error: memberStoreDataError } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('id', memberData.store_id)
                    .single();

                if (memberStoreDataError) {
                    throw new Error(`Erro ao carregar loja vinculada: ${memberStoreDataError.message}.`);
                }
                storeDataResult = memberStoreData;
            }
        }

        if (!storeDataResult) {
            setStore(null);
            setProductsState([]);
            setSalesState([]);
            setCashRegistersState([]);
            setStoreStatus('none');
            return;
        }

        const { data: membersData, error: rpcError } = await supabase.rpc('get_store_members', {
          p_store_id: storeDataResult.id,
        });

        if (rpcError) {
          console.warn(`[STORE] RPC get_store_members falhou (pode ser permissão ou a função não existe): ${rpcError.message}`);
        }

        const storeWithMembers = { ...storeDataResult, members: membersData || [] };
        setStore(storeWithMembers as Store);

        const [productsRes, salesRes, cashRes] = await Promise.all([
            supabase.from('products').select('*').eq('store_id', storeDataResult.id),
            supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeDataResult.id).order('created_at', { ascending: false }),
            supabase.from('cash_registers').select('*').eq('store_id', storeDataResult.id).order('opened_at', { ascending: false }),
        ]);

        if (productsRes.error) throw new Error(`Falha ao carregar produtos: ${productsRes.error.message}`);
        if (salesRes.error) throw new Error(`Falha ao carregar vendas: ${salesRes.error.message}`);
        if (cashRes.error) throw new Error(`Falha ao carregar caixas: ${cashRes.error.message}`);

        setProductsState(productsRes.data || []);
        setSalesState(salesRes.data || []);
        setCashRegistersState(cashRes.data || []);
        setStoreStatus('has');

      } catch(e: any) {
          console.error("[STORE] fetchStoreData failed:", e.message);
          setStoreStatus('error');
          setStoreError(e.message);
          setStore(null);
      }
    },
    [supabase]
  );

  const handleSession = useCallback(
    async (session: any) => {
      if (!supabase) return;

      const supabaseUser = session?.user;

      if (!supabaseUser) {
        setUser(null);
        setStore(null);
        setStoreStatus('unknown');
        setProductsState([]);
        setSalesState([]);
        setCashRegistersState([]);
        return;
      }
      
      let profile: any = null;
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        profile = profileData;

        if (!profile) {
            const { error: insertError } = await supabase.from('users').insert({ id: supabaseUser.id, email: supabaseUser.email });
            if (insertError) throw insertError;
            profile = { id: supabaseUser.id, email: supabaseUser.email };
        }
      } catch(e: any) {
          console.error('[AUTH] Profile fetch/create error, using fallback. Error:', e.message);
      }
      
      const safeProfile = profile ?? { id: supabaseUser.id, email: supabaseUser.email! };
      setUser(safeProfile as User);
      await fetchStoreData(supabaseUser.id);
    },
    [supabase, fetchStoreData]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setStoreStatus('error');
      setStoreError('Supabase não configurado. Verifique as variáveis de ambiente.');
      return;
    }

    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        if (mounted) await handleSession(data?.session);
      } catch (e: any) {
        console.error('[AUTH] bootstrap error', e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setLoading(true);
        await handleSession(session);
        setLoading(false);
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

      if (error?.message.includes('User already registered')) {
        return { error: { ...error, message: 'E-mail já cadastrado.' } };
      }
      return { error };
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    setStoreStatus('unknown');
    router.push('/login');
  }, [supabase, router]);

  const deleteAccount = useCallback(async () => {
      if (!supabase) return { error: { name: 'NoSupabase', message: 'Supabase client not available' } as AuthError };
      const { error } = await supabase.rpc('delete_user_account');
      if (!error) await logout();
      return { error };
  }, [supabase, logout]);

  const createStore = useCallback(
    async (storeData: any): Promise<Store | null> => {
      if (!supabase || !user) return null;
      
      const { data: newStoreData, error } = await supabase
        .rpc('create_new_store', {
          p_name: storeData.name,
          p_legal_name: storeData.legal_name,
          p_cnpj: storeData.cnpj,
          p_address: storeData.address,
          p_phone: storeData.phone,
          p_timezone: storeData.timezone,
        })
        .select()
        .single();

      if (error) {
        console.error('[STORE] Error creating store:', error);
        setStoreStatus('error');
        setStoreError(`Falha ao criar loja via RPC 'create_new_store': ${error.message}. Verifique as permissões da função.`);
        return null;
      }
      
      await fetchStoreData(user.id);
      return newStoreData as Store;
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

      const { error } = await supabase.from('store_members').delete().match({ user_id: userId, store_id: store.id });
      if (!error) await fetchStoreData(user.id);
      else console.error('[STORE] removeStoreMember error', error);
      return { error };
    },
    [supabase, store, user, fetchStoreData]
  );

  const addSale = useCallback(
    async (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card'): Promise<{ ok: boolean, error?: string }> => {
        if (!supabase || !store || !user) {
            return { ok: false, error: 'Sessão/loja não inicializada.' };
        }

        const total_cents = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);
        const saleId = `sale_${Date.now()}`;

        try {
            // Step 1: Insert the main sale record
            const { data: saleResult, error: saleError } = await supabase
                .from('sales')
                .insert({
                    id: saleId,
                    store_id: store.id,
                    payment_method: paymentMethod,
                    total_cents: total_cents,
                })
                .select('id')
                .single();

            if (saleError || !saleResult) {
                console.error('[SALE] Error creating sale record', saleError);
                throw saleError || new Error('Failed to create sale record.');
            }

            // Step 2: Insert sale items
            const saleItemsToInsert = cart.map(item => ({
                sale_id: saleId,
                product_id: item.product_id,
                product_name_snapshot: item.product_name_snapshot,
                quantity: item.quantity,
                unit_price_cents: item.unit_price_cents,
                subtotal_cents: item.subtotal_cents,
            }));

            const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsToInsert);

            if (itemsError) {
                console.error('[SALE] Error creating sale items, rolling back...', itemsError);
                // If inserting items fails, we must delete the sale record to maintain consistency.
                await supabase.from('sales').delete().eq('id', saleId);
                throw itemsError;
            }

            // Step 3: Decrement stock for each product
            const stockDecrementPromises = cart.map(item =>
                supabase.rpc('decrement_stock', {
                    p_product_id: item.product_id,
                    p_quantity: item.quantity,
                })
            );
            
            const stockResults = await Promise.all(stockDecrementPromises);
            const stockError = stockResults.find(res => res.error);

            if (stockError) {
                console.error('[SALE] Error decrementing stock, rolling back...', stockError.error);
                // If decrementing stock fails, roll back the entire sale. This is a best-effort rollback.
                await supabase.from('sales').delete().eq('id', saleId);
                // Note: items are cascaded deleted by the DB.
                throw stockError.error || new Error('Failed to decrement stock.');
            }

            // Step 4: If everything is successful, refresh data and return success
            await fetchStoreData(user.id);
            return { ok: true };

        } catch (error: any) {
            console.error('[SALE] Full sale creation process failed:', error);
            return { ok: false, error: error?.message || 'Falha inesperada ao criar venda.' };
        }
    },
    [supabase, store, user, fetchStoreData]
  );
  
  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'store_id' | 'created_at'>) => {
      if (!supabase || !store || !user) return;
      const { error } = await supabase.from('products').insert({ ...productData, store_id: store.id });
      if (error) console.error('[PRODUCT] insert error', error);
      else await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);

  const updateProduct = useCallback(async (productId: string, productData: Partial<Omit<Product, 'id' | 'store_id' | 'created_at'>>) => {
      if (!supabase || !user) return;
      const { error } = await supabase.from('products').update(productData).eq('id', productId);
      if (error) console.error('[PRODUCT] update error', error);
      else await fetchStoreData(user.id);
  }, [supabase, user, fetchStoreData]);
  
  const removeProduct = useCallback(async (productId: string) => {
    if (!supabase || !user) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
        console.error('[PRODUCT] delete error', error);
        throw error;
    }
    await fetchStoreData(user.id);
  }, [supabase, user, fetchStoreData]);

  const updateProductStock = useCallback(async (productId: string, newStock: number) => {
      if (!supabase || !user) return;
      await updateProduct(productId, { stock_qty: newStock });
  }, [supabase, user, updateProduct]);


  const setSales = useCallback(async () => {
    console.warn('setSales is not implemented for Supabase backend. Use addSale for modifications.');
  }, []);

  const setCashRegisters = useCallback(
    async (action: React.SetStateAction<CashRegister[]>) => {
      if (!supabase || !user || !store) return;
      const newCashRegisters = typeof action === 'function' ? action(cashRegisters) : action;
      const oldRegisterIds = new Set(cashRegisters.map((cr) => cr.id));

      for (const cr of newCashRegisters) {
        if (oldRegisterIds.has(cr.id)) {
          const { id, ...updateData } = cr;
          const { error } = await supabase.from('cash_registers').update(updateData).eq('id', id);
          if (error) console.error('[CASH] update error', error);
        } else {
          const { error } = await supabase.from('cash_registers').insert({ ...cr, store_id: store.id });
          if (error) console.error('[CASH] insert error', error);
        }
      }
      await fetchStoreData(user.id);
    },
    [supabase, user, store, cashRegisters, fetchStoreData]
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
    addSale,
    addProduct,
    updateProduct,
    removeProduct,
    updateProductStock,
    setSales,
    setCashRegisters,
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
