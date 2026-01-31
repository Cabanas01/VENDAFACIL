
'use client';

/**
 * @fileOverview AuthProvider (MOTOR DE ESTADO PASSIVO)
 * 
 * Sincroniza sessão e dados do tenant. 
 * Proxy de ações críticas para Server Actions para garantir auth.uid().
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { 
  Store, 
  Product, 
  Sale, 
  CashRegister, 
  StoreStatus, 
  StoreAccessStatus,
  CartItem,
  Customer
} from '@/lib/types';
import { processSaleAction } from '@/app/actions/sales-actions';

type AuthContextType = {
  user: User | null;
  loading: boolean; 
  store: Store | null;
  storeStatus: StoreStatus;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  cashRegisters: CashRegister[];
  
  fetchStoreData: (userId: string, silent?: boolean) => Promise<void>;
  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (data: any) => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: any }>;
  addProduct: (product: any) => Promise<void>;
  addCustomer: (customer: any) => Promise<void>;
  updateProduct: (id: string, product: any) => Promise<void>;
  updateProductStock: (id: string, qty: number) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  findProductByBarcode: (barcode: string) => Promise<Product | null>;
  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<any>;
  setCashRegisters: (action: any) => Promise<void>;
  deleteAccount: () => Promise<{ error: any }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); 
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('loading_auth');
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchStoreData = useCallback(async (userId: string, silent: boolean = false) => {
    if (!userId) return;
    if (!silent) setStoreStatus('loading_store');
    
    try {
      const { data: ownerStore, error: ownerError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerError) {
        if (!silent) setStoreStatus('error');
        return;
      }

      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (memberError) {
          if (!silent) setStoreStatus('error');
          return;
        }
        storeId = memberEntry?.store_id;
      }

      if (!storeId) {
        setStore(null);
        if (!silent) setStoreStatus('no_store');
        return;
      }

      const [statusRes, storeRes, productsRes, salesRes, cashRes, customersRes] = await Promise.all([
        supabase.rpc('get_store_access_status', { p_store_id: storeId }),
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
      ]);

      if (storeRes.error) throw storeRes.error;

      setAccessStatus(statusRes.data?.[0] || null);
      setStore(storeRes.data as Store);
      setProducts(productsRes.data as Product[] || []);
      setSales(salesRes.data as Sale[] || []);
      setCustomers(customersRes.data as Customer[] || []);
      setCashRegistersState(cashRes.data as CashRegister[] || []);
      
      if (!silent) setStoreStatus('has_store');

    } catch (err) {
      console.error('[AUTH_PROVIDER] Sync error:', err);
      if (!silent) setStoreStatus('error');
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      setUser(sessionUser);
      setLoading(false);

      if (sessionUser) {
        fetchStoreData(sessionUser.id);
      } else {
        setStoreStatus('no_store'); 
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        fetchStoreData(newUser.id);
      } else {
        setStore(null);
        setStoreStatus('no_store');
        setAccessStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchStoreData]);

  const createStore = useCallback(async (storeData: any) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Usuário não autenticado.');

    const { data, error } = await supabase.rpc('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone || 'America/Sao_Paulo',
    });

    if (error) throw error;

    await fetchStoreData(currentUser.id);
    return data as Store;
  }, [fetchStoreData]);

  const updateStore = useCallback(async (data: any) => {
    if (!store || !user) return;
    await supabase.from('stores').update(data).eq('id', store.id);
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const updateUser = useCallback(async (data: any) => {
    if (!user) return;
    await supabase.from('users').update(data).eq('id', user.id);
  }, [user]);

  const removeStoreMember = useCallback(async (userId: string) => {
    if (!store || !user) return { error: new Error('Sessão inválida') };
    const { error } = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
    if (!error) await fetchStoreData(user.id, true);
    return { error };
  }, [store, user, fetchStoreData]);

  const addProduct = useCallback(async (product: any) => {
    if (!store || !user) return;
    await supabase.from('products').insert({ ...product, store_id: store.id });
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const addCustomer = useCallback(async (customer: any) => {
    if (!store || !user) return;
    const { error } = await supabase.from('customers').insert({ ...customer, store_id: store.id });
    if (error) throw error;
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const updateProduct = useCallback(async (id: string, product: any) => {
    if (!store || !user) return;
    await supabase.from('products').update(product).eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const updateProductStock = useCallback(async (id: string, qty: number) => {
    if (!store || !user) return;
    await supabase.from('products').update({ stock_qty: qty }).eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const removeProduct = useCallback(async (id: string) => {
    if (!store || !user) return;
    await supabase.from('products').delete().eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const findProductByBarcode = useCallback(async (barcode: string) => {
    if (!store) return null;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('barcode', barcode).maybeSingle();
    return data as Product || null;
  }, [store]);

  /**
   * PROXY PARA SERVER ACTION
   * Envia a venda para o servidor onde o auth.uid() é garantido via cookies.
   */
  const addSale = useCallback(async (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => {
    // Dispara a Server Action (Opção 1)
    const result = await processSaleAction(cart, paymentMethod);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    // Recarregar dados em segundo plano para refletir estoque e nova venda
    if (user) {
      fetchStoreData(user.id, true).catch(err => console.warn('[SYNC_WARN]', err));
    }

    return result;
  }, [user, fetchStoreData]);

  const setCashRegisters = useCallback(async (action: any) => {
    if (!store || !user) return;
    const next = typeof action === 'function' ? action(cashRegisters) : action;
    for (const cr of next) {
      if (cashRegisters.find(c => c.id === cr.id)) {
        await supabase.from('cash_registers').update(cr).eq('id', cr.id);
      } else {
        await supabase.from('cash_registers').insert({ ...cr, store_id: store.id });
      }
    }
    await fetchStoreData(user.id, true);
  }, [store, user, cashRegisters, fetchStoreData]);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_user_account');
    return { error };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, store, storeStatus, accessStatus, products, sales, customers, cashRegisters,
      fetchStoreData, createStore, updateStore, updateUser, removeStoreMember,
      addProduct, addCustomer, updateProduct, updateProductStock, removeProduct,
      findProductByBarcode, addSale, setCashRegisters, deleteAccount, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
