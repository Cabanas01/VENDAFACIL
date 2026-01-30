
'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import type {
  Store,
  Product,
  Sale,
  CashRegister,
  CartItem,
  StoreStatus,
  StoreMember,
  StoreAccessStatus,
  Customer,
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  store: Store | null;
  storeStatus: StoreStatus;
  storeError: string | null;
  accessStatus: StoreAccessStatus | null;
  
  logout: () => Promise<void>;
  fetchStoreData: (userId: string) => Promise<void>;
  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: any) => Promise<void>;
  updateUser: (userData: any) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<any>;
  
  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];
  addProduct: (product: any) => Promise<void>;
  addCustomer: (customer: any) => Promise<void>;
  updateProduct: (id: string, product: any) => Promise<void>;
  updateProductStock: (id: string, qty: number) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  findProductByBarcode: (barcode: string) => Promise<Product | null>;
  setCashRegisters: (action: any) => Promise<void>;
  addSale: (cart: CartItem[], paymentMethod: any) => Promise<Sale | null>;
  deleteAccount: () => Promise<any>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Estados da Loja (Carregados em segundo plano após auth)
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [storeError, setStoreError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchAccessStatus = useCallback(async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_store_access_status', { p_store_id: storeId });
    if (!error && data?.[0]) setAccessStatus(data[0]);
  }, []);

  const fetchStoreData = useCallback(async (userId: string) => {
    setStoreStatus('loading');
    try {
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        storeId = memberEntry?.store_id;
      }

      if (!storeId) {
        setStore(null);
        setStoreStatus('none');
        return;
      }

      await fetchAccessStatus(storeId);
      const { data: storeDetails } = await supabase.from('stores').select('*, trial_used, trial_started_at').eq('id', storeId).single();
      const [productsRes, salesRes, cashRes, membersRes] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('store_members').select('*').eq('store_id', storeId),
      ]);

      setStore(storeDetails as Store);
      setProducts(productsRes.data ?? []);
      setSales(salesRes.data ?? []);
      setCashRegistersState(cashRes.data ?? []);
      setStoreStatus('has');
    } catch (err: any) {
      setStoreStatus('error');
      setStoreError(err.message);
    }
  }, [fetchAccessStatus]);

  useEffect(() => {
    // 1. Verificação inicial de sessão
    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchStoreData(initialSession.user.id);
      }
      setIsLoading(false);
    };

    initAuth();

    // 2. Listener de mudanças de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (event === 'SIGNED_IN' && newSession?.user) {
        await fetchStoreData(newSession.user.id);
      }
      
      if (event === 'SIGNED_OUT') {
        setStore(null);
        setStoreStatus('unknown');
        setAccessStatus(null);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchStoreData]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
  }, []);

  // Wrappers de ações (sem navegação)
  const createStore = useCallback(async (storeData: any) => {
    if (!user) return null;
    const { data, error } = await supabase.rpc('create_new_store', storeData).select().single();
    if (error) { setStoreError(error.message); return null; }
    await fetchStoreData(user.id);
    return data as Store;
  }, [user, fetchStoreData]);

  const updateStore = useCallback(async (data: any) => {
    if (store) {
      await supabase.from('stores').update(data).eq('id', store.id);
      await fetchStoreData(user!.id);
    }
  }, [store, user, fetchStoreData]);

  const updateUser = useCallback(async (data: any) => {
    if (user) await supabase.from('users').update(data).eq('id', user.id);
  }, [user]);

  const removeStoreMember = useCallback(async (userId: string) => {
    if (!store) return;
    const res = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
    await fetchStoreData(user!.id);
    return res;
  }, [store, user, fetchStoreData]);

  const addProduct = useCallback(async (p: any) => {
    if (store) {
      await supabase.from('products').insert({ ...p, store_id: store.id });
      await fetchStoreData(user!.id);
    }
  }, [store, user, fetchStoreData]);

  const addCustomer = useCallback(async (c: any) => {
    if (store) {
      const { error } = await supabase.from('customers').insert({ ...c, store_id: store.id });
      if (error) throw error;
      await fetchStoreData(user!.id);
    }
  }, [store, user, fetchStoreData]);

  const updateProduct = useCallback(async (id: string, p: any) => {
    await supabase.from('products').update(p).eq('id', id);
    await fetchStoreData(user!.id);
  }, [user, fetchStoreData]);

  const updateProductStock = useCallback(async (id: string, qty: number) => {
    await supabase.from('products').update({ stock_qty: qty }).eq('id', id);
    await fetchStoreData(user!.id);
  }, [user, fetchStoreData]);

  const removeProduct = useCallback(async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    await fetchStoreData(user!.id);
  }, [user, fetchStoreData]);

  const findProductByBarcode = useCallback(async (barcode: string) => {
    if (!store) return null;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('barcode', barcode).maybeSingle();
    return data;
  }, [store]);

  const setCashRegisters = useCallback(async (action: any) => {
    if (!store) return;
    const next = typeof action === 'function' ? action(cashRegisters) : action;
    for (const cr of next) {
      if (cashRegisters.find(c => c.id === cr.id)) {
        await supabase.from('cash_registers').update(cr).eq('id', cr.id);
      } else {
        await supabase.from('cash_registers').insert({ ...cr, store_id: store.id });
      }
    }
    await fetchStoreData(user!.id);
  }, [store, user, cashRegisters, fetchStoreData]);

  const addSale = useCallback(async (cart: CartItem[], method: any) => {
    if (!store) return null;
    const saleId = crypto.randomUUID();
    const total = cart.reduce((s, i) => s + i.subtotal_cents, 0);
    const { data, error } = await supabase.from('sales').insert({ id: saleId, store_id: store.id, total_cents: total, payment_method: method }).select().single();
    if (error) throw error;
    for (const item of cart) {
      await supabase.from('sale_items').insert({ sale_id: saleId, product_id: item.product_id, quantity: item.quantity, unit_price_cents: item.unit_price_cents, subtotal_cents: item.subtotal_cents, product_name_snapshot: item.product_name_snapshot });
      await supabase.rpc('decrement_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
    }
    await fetchStoreData(user!.id);
    return data as Sale;
  }, [store, user, fetchStoreData]);

  const deleteAccount = useCallback(async () => {
    const res = await supabase.rpc('delete_user_account');
    if (!res.error) await logout();
    return res;
  }, [logout]);

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    store,
    storeStatus,
    storeError,
    accessStatus,
    logout,
    fetchStoreData,
    createStore,
    updateStore,
    updateUser,
    removeStoreMember,
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
    deleteAccount
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
