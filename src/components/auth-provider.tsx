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
import type { AuthError, Session } from '@supabase/supabase-js';
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

type AuthContextType = {
  user: User | null;
  store: Store | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Initial auth check
  storeStatus: StoreStatus;
  storeError: string | null;
  accessStatus: StoreAccessStatus | null;
  
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

  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [storeError, setStoreError] = useState<string | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchAccessStatus = useCallback(async (storeId: string) => {
    const { data, error } = await supabase
      .rpc('get_store_access_status', { p_store_id: storeId });
    
    if (error) {
        setAccessStatus({
            acesso_liberado: false,
            data_fim_acesso: null,
            plano_nome: 'Erro',
            plano_tipo: 'free',
            mensagem: 'Não foi possível verificar seu acesso.'
        });
        return;
    }

    if (Array.isArray(data) && data.length > 0) {
        setAccessStatus(data[0]);
    } else {
        setAccessStatus({
            acesso_liberado: false,
            data_fim_acesso: null,
            plano_nome: 'Sem Plano',
            plano_tipo: 'free',
            mensagem: 'Sua loja não possui um plano de acesso.'
        });
    }
  }, []);

  const fetchStoreData = useCallback(async (userId: string) => {
    setStoreStatus('loading');
    try {
      let storeId: string | null = null;

      const { data: ownerStore } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerStore) {
        storeId = ownerStore.id;
      } else {
        const { data: memberEntry } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (memberEntry) storeId = memberEntry.store_id;
      }

      if (!storeId) {
        setStore(null);
        setStoreStatus('none');
        return;
      }

      await fetchAccessStatus(storeId);

      const { data: storeDetails } = await supabase
        .from('stores')
        .select('*, trial_used, trial_started_at')
        .eq('id', storeId)
        .single();

      const [productsRes, salesRes, cashRes, membersRes] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('store_members').select('*').eq('store_id', storeId),
      ]);

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

      setStore({ ...storeDetails, members } as Store);
      setProducts(productsRes.data ?? []);
      setSales(salesRes.data ?? []);
      setCashRegistersState(cashRes.data ?? []);
      setStoreStatus('has');
    } catch (err: any) {
      console.error('[STORE] fetch error', err);
      setStoreStatus('error');
      setStoreError(err.message);
    }
  }, [fetchAccessStatus]);

  const handleAuthStateChange = useCallback(async (currentSession: Session | null) => {
    setSession(currentSession);
    const currentUser = currentSession?.user;
    
    if (currentUser) {
      const { data: profile } = await supabase.from('users').select('id, email, name, avatar_url, is_admin').eq('id', currentUser.id).single();
      setUser(profile as User);
      await fetchStoreData(currentUser.id);
    } else {
      setUser(null);
      setStore(null);
      setAccessStatus(null);
      setStoreStatus('unknown');
    }
    setIsLoading(false);
  }, [fetchStoreData]);

  useEffect(() => {
    let mounted = true;

    // Check initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        handleAuthStateChange(initialSession);
      }
    });

    // Listen for changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (mounted) {
          if (event === 'SIGNED_OUT') {
            handleAuthStateChange(null);
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            handleAuthStateChange(newSession);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [handleAuthStateChange]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.replace('/login');
  }, [router]);

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

    if (error) {
      setStoreError(error.message);
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
    if (!store || !user || userId === store.user_id) return { error: new Error('Inválido') };
    const { error } = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
    if (!error) await fetchStoreData(user.id);
    return { error };
  }, [store, user, fetchStoreData]);

  const addProduct = useCallback(async (product: any) => {
    if (!store || !user) return;
    await supabase.from('products').insert({ ...product, store_id: store.id, barcode: product.barcode || null });
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);
  
  const addCustomer = useCallback(async (customer: any) => {
    if (!store || !user) throw new Error('Sessão inválida');
    const { error } = await supabase.from('customers').insert({ ...customer, store_id: store.id });
    if (error) {
      if (error.message.includes('trial_customer_limit')) throw new Error('Limite de clientes atingido.');
      throw error;
    }
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateProduct = useCallback(async (id: string, product: any) => {
    if (!store || !user) return;
    await supabase.from('products').update({ ...product, barcode: product.barcode || null }).eq('id', id);
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateProductStock = useCallback(async (id: string, qty: number) => {
    if (!store || !user) return;
    await supabase.from('products').update({ stock_qty: qty }).eq('id', id);
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const removeProduct = useCallback(async (id: string) => {
    if (!store || !user) return;
    await supabase.from('products').delete().eq('id', id);
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const findProductByBarcode = useCallback(async (barcode: string) => {
    if (!store) return null;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('barcode', barcode).maybeSingle();
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

  const addSale = useCallback(async (cart: CartItem[], paymentMethod: any) => {
    if (!store || !user) throw new Error('Sessão inválida');
    const saleId = crypto.randomUUID();
    const total = cart.reduce((s, i) => s + i.subtotal_cents, 0);
    try {
      const { data: saleData, error: saleError } = await supabase.from('sales').insert({ id: saleId, store_id: store.id, total_cents: total, payment_method: paymentMethod }).select().single();
      if (saleError) throw saleError;
      for (const item of cart) {
        await supabase.from('sale_items').insert({
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          subtotal_cents: item.subtotal_cents,
          product_name_snapshot: item.product_name_snapshot,
        });
        await supabase.rpc('decrement_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
      }
      await fetchStoreData(user.id);
      return saleData as Sale;
    } catch (error: any) {
      if (error.message.includes('trial_sales_limit')) throw new Error('Limite de vendas atingido.');
      throw error;
    }
  }, [store, user, fetchStoreData]);

  const value: AuthContextType = {
    user,
    store,
    session,
    isAuthenticated: !!session?.user,
    isLoading,
    storeStatus,
    storeError,
    accessStatus,
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
