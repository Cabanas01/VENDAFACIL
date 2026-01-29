'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import type {
  User,
  Store,
  Product,
  Sale,
  CashRegister,
  CartItem,
  StoreStatus,
  StoreMember,
  SaleItem,
  StoreAccessStatus,
  Customer,
} from '@/lib/types';
import { addDays } from 'date-fns';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  store: Store | null;
  loading: boolean;
  storeStatus: StoreStatus;
  storeError: string | null;

  accessStatus: StoreAccessStatus | null;

  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error: AuthError | Error | null }>;

  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => Promise<void>;
  updateUser: (userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: AuthError | Error | null }>;
  fetchStoreData: (userId: string) => Promise<void>;

  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];

  addProduct: (product: Omit<Product, 'id' | 'store_id' | 'created_at'>) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'store_id' | 'created_at'>) => Promise<void>;
  updateProduct: (productId: string, product: Partial<Omit<Product, 'id' | 'store_id'>>) => Promise<void>;
  updateProductStock: (productId: string, newStock: number) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  findProductByBarcode: (barcode: string) => Promise<Product | null>;

  setCashRegisters: (action: React.SetStateAction<CashRegister[]>) => Promise<void>;
  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<Sale | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('loading');
  const [storeError, setStoreError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  // Resets store-related state (used on logout or when no session)
  const resetStoreState = useCallback(() => {
    setStore(null);
    setProducts([]);
    setSales([]);
    setCashRegistersState([]);
    setAccessStatus(null);
    setStoreStatus('unknown');
    setStoreError(null);
  }, []);

  const fetchAccessStatus = useCallback(async (storeId: string) => {
    const { data, error } = await supabase
      .rpc('get_store_access_status', { p_store_id: storeId });
    
    if (error) {
        setAccessStatus({
            acesso_liberado: false,
            data_fim_acesso: null,
            plano_nome: 'Erro',
            mensagem: 'Não foi possível verificar seu acesso. Tente novamente mais tarde.'
        });
        return;
    }

    if (Array.isArray(data) && data.length > 0) {
        setAccessStatus(data[0]);
    } else {
        const fallbackStatus = {
            acesso_liberado: false,
            data_fim_acesso: null,
            plano_nome: 'Sem Plano',
            mensagem: 'Sua loja não possui um plano de acesso. Escolha um plano para começar.'
        };
        setAccessStatus(fallbackStatus);
    }
  }, []);

  const fetchStoreData = useCallback(async (userId: string) => {
    setStoreStatus('loading');
    setStoreError(null);
    setAccessStatus(null);

    try {
      let storeId: string | null = null;

      const { data: ownerStore, error: ownerError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerError) throw ownerError;

      if (ownerStore) {
        storeId = ownerStore.id;
      } else {
        const { data: memberEntry, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (memberError) throw memberError;
        if (memberEntry) storeId = memberEntry.store_id;
      }

      if (!storeId) {
        setStore(null);
        setStoreStatus('none');
        setProducts([]);
        setSales([]);
        setCashRegistersState([]);
        return;
      }

      await fetchAccessStatus(storeId);

      const { data: storeDetails, error: storeErr } = await supabase
        .from('stores')
        .select('*, trial_used, trial_started_at')
        .eq('id', storeId)
        .single();

      if (storeErr || !storeDetails) throw storeErr;

      const [
        productsRes,
        salesRes,
        cashRes,
        membersRes,
      ] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('store_members').select('*').eq('store_id', storeId),
      ]);

      if (productsRes.error || salesRes.error || cashRes.error || membersRes.error) {
        throw productsRes.error || salesRes.error || cashRes.error || membersRes.error;
      }

      let members: StoreMember[] = [];
      if (membersRes.data?.length) {
        const userIds = membersRes.data.map(m => m.user_id);
        const { data: profiles } = await supabase.from('users').select('*').in('id', userIds);
        const map = new Map((profiles ?? []).map(p => [p.id, p]));
        members = membersRes.data.map(m => ({
          ...m,
          name: map.get(m.user_id)?.name ?? null,
          email: map.get(m.user_id)?.email ?? null,
          avatar_url: map.get(m.user_id)?.avatar_url ?? null,
        }));
      }

      setStore({ ...storeDetails, members });
      setProducts(productsRes.data ?? []);
      setSales(salesRes.data ?? []);
      setCashRegistersState(cashRes.data ?? []);
      setStoreStatus('has');
    } catch (err: any) {
      console.error('[STORE] fetch error', err);
      setStore(null);
      setStoreStatus('error');
      setStoreError(err.message ?? 'Erro desconhecido');
    }
  }, [fetchAccessStatus]);

  const handleSession = useCallback(
    async (session: any) => {
      const supabaseUser = session?.user;
      if (!supabaseUser) {
        setUser(null);
        resetStoreState();
        return;
      }

      // Set a minimal user object immediately to reflect auth state
      setUser({ id: supabaseUser.id, email: (supabaseUser.email ?? null) as any, name: null, avatar_url: null, is_admin: false } as unknown as User);

      // Fetch full profile in background and update user when ready
      (async () => {
        try {
          const { data: profile } = await supabase.from('users').select('id, email, name, avatar_url, is_admin').eq('id', supabaseUser.id).single();
          if (profile) setUser(profile as User);
        } catch (err) {
          // keep the minimal user if profile fetch fails
        }
      })();

      // Load store data in background (do not block auth/loading)
      fetchStoreData(supabaseUser.id);
    },
    [fetchStoreData, resetStoreState]
  );

  useEffect(() => {
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // Apply auth state first (do not wait for store loading)
      handleSession(session);
      // loading represents ONLY auth; stop loading immediately after session resolved
      setLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Keep same pattern: set auth quickly, load store in background
        handleSession(session);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [handleSession]);

  const login = useCallback(
    async (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    []
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : undefined,
        },
      });
      return { error };
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // Ensure store state is cleared on logout
    resetStoreState();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_user_account');
    if (!error) await logout();
    return { error };
  }, [logout]);

  const createStore = useCallback(async (storeData: any) => {
    if (!user) return null;
    
    const { data: newStore, error } = await supabase.rpc('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone,
    }).select().single();

    if (error || !newStore) {
      setStoreError(error?.message || 'Failed to create store.');
      return null;
    }
    
    await fetchStoreData(user.id);
    return newStore as Store;
  }, [user, fetchStoreData]);

  const updateStore = useCallback(async (data: any) => {
    if (!store || !user) return;
    await supabase.from('stores').update(data).eq('id', store.id);
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateUser = useCallback(async (data: any) => {
    if (!user) return;
    const { data: updated } = await supabase.from('users').update(data).eq('id', user.id).select().single();
    if (updated) setUser(updated as User);
  }, [user]);

  const removeStoreMember = useCallback(async (userId: string) => {
    if (!store || !user || userId === store.user_id) {
      return { error: new Error('Operação inválida') };
    }
    const { error } = await supabase
      .from('store_members')
      .delete()
      .eq('user_id', userId)
      .eq('store_id', store.id);

    if (!error) await fetchStoreData(user.id);
    return { error };
  }, [store, user, fetchStoreData]);

  const addProduct = useCallback(async (product: any) => {
    if (!store || !user) return;
    await supabase.from('products').insert({ ...product, store_id: store.id, barcode: product.barcode || null });
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);
  
  const addCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'store_id' | 'created_at'>) => {
    if (!store || !user) throw new Error('Sessão inválida');

    try {
      const { error: insertError } = await supabase.from('customers').insert({ ...customer, store_id: store.id });
      if (insertError) throw insertError;
    } catch (error: any) {
        if (error.message.includes('trial_customer_limit')) {
            throw new Error('Limite de 10 clientes do plano de avaliação foi atingido. Faça o upgrade para continuar.');
        }
        throw error;
    }
  }, [store, user]);


  const updateProduct = useCallback(async (id: string, product: any) => {
    if (!store || !user) return;
    await supabase.from('products').update({ ...product, barcode: product.barcode || null }).eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateProductStock = useCallback(async (id: string, qty: number) => {
    if (!store || !user) return;
    await supabase.from('products').update({ stock_qty: qty }).eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const removeProduct = useCallback(async (id: string) => {
    if (!store || !user) return;
    await supabase.from('products').delete().eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const findProductByBarcode = useCallback(async (barcode: string) => {
    if (!store) return null;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .eq('barcode', barcode)
      .maybeSingle();
    return data ?? null;
  }, [store]);

  const setCashRegisters = useCallback(async (action: any) => {
    if (!store || !user) return;
    const next = typeof action === 'function' ? action(cashRegisters) : action;

    for (const cr of next) {
      if (cashRegisters.find(c => c.id === cr.id)) {
        const { id, ...data } = cr;
        await supabase.from('cash_registers').update(data).eq('id', id);
      } else {
        await supabase.from('cash_registers').insert({ ...cr, store_id: store.id });
      }
    }
    await fetchStoreData(user.id);
  }, [store, user, cashRegisters, fetchStoreData]);

  const addSale = useCallback(async (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => {
    if (!store || !user) throw new Error('Sessão inválida');

    // Pre-flight check in the frontend for immediate feedback
    for (const item of cart) {
      const product = products.find(p => p.id === item.product_id);
      if (!product || product.stock_qty < item.quantity) {
        throw new Error(`Estoque insuficiente para ${item.product_name_snapshot}`);
      }
    }

    const saleId = crypto.randomUUID();
    const total = cart.reduce((s, i) => s + i.subtotal_cents, 0);

    let saleData, saleError;

    try {
      const saleInsertResult = await supabase
          .from('sales')
          .insert({ id: saleId, store_id: store.id, total_cents: total, payment_method: paymentMethod })
          .select()
          .single();
      saleData = saleInsertResult.data;
      saleError = saleInsertResult.error;

      if (saleError) throw saleError;
      if (!saleData) throw new Error('Falha ao criar o registro da venda.');
    
      let createdSaleItems: SaleItem[] = [];

      // Sequentially process each item
      for (const item of cart) {
          // 1. Insert the sale item
          const { data: saleItemData, error: itemError } = await supabase
              .from('sale_items')
              .insert({
                  sale_id: saleId,
                  product_id: item.product_id,
                  quantity: item.quantity,
                  unit_price_cents: item.unit_price_cents,
                  subtotal_cents: item.subtotal_cents,
                  product_name_snapshot: item.product_name_snapshot,
                  product_barcode_snapshot: item.product_barcode_snapshot,
              })
              .select()
              .single();

          if (itemError) throw itemError;
          createdSaleItems.push(saleItemData as SaleItem);

          // 2. Decrement stock
          const { error: stockError } = await supabase.rpc('decrement_stock', {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
          });
          if (stockError) throw stockError;
      }

      // If all items are processed successfully, finalize by fetching all data
      await fetchStoreData(user.id);
      return { ...saleData, items: createdSaleItems } as Sale;

    } catch (error: any) {
        console.error('[SALE] Transaction failed, attempting rollback...', error);
        
        // If sale record was created, attempt to delete it.
        if (saleData) {
          await supabase.from('sales').delete().eq('id', saleId);
        }

        if (error.message.includes('trial_sales_limit')) {
            throw new Error('Limite de 5 vendas do plano de avaliação foi atingido. Faça o upgrade para continuar.');
        }

        throw new Error(error.message || 'Falha ao processar a venda. A transação foi revertida.');
    }
  }, [store, user, products, fetchStoreData]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    store,
    loading,
    storeStatus,
    storeError,
    accessStatus,
    login,
    signup,
    logout,
    deleteAccount,
    createStore,
    updateStore,
    updateUser,
    removeStoreMember,
    fetchStoreData,
    products,
    sales,
    cashRegisters,
    addProduct,
    addCustomer,
    updateProduct,
    updateProductStock,
    removeProduct,
    findProductByBarcode,
    setCashRegisters,
    addSale,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
