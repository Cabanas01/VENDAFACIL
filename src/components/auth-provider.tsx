'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';
import type { 
  Store, 
  Product, 
  Sale, 
  CashRegister, 
  StoreStatus, 
  StoreAccessStatus,
  Customer,
  CartItem
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  store: Store | null;
  storeStatus: StoreStatus;
  storeError: string | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];
  fetchStoreData: (userId: string) => Promise<void>;
  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => Promise<void>;
  updateUser: (userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: AuthError | Error | null }>;
  addProduct: (product: Omit<Product, 'id' | 'store_id' | 'created_at'>) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'store_id' | 'created_at'>) => Promise<void>;
  updateProduct: (productId: string, product: Partial<Omit<Product, 'id' | 'store_id'>>) => Promise<void>;
  updateProductStock: (productId: string, newStock: number) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  findProductByBarcode: (barcode: string) => Promise<Product | null>;
  setCashRegisters: (action: React.SetStateAction<CashRegister[]>) => Promise<void>;
  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<Sale | null>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error: AuthError | Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [storeError, setStoreError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchAccessStatus = useCallback(async (storeId: string) => {
    const { data, error } = await supabase.rpc('get_store_access_status', { p_store_id: storeId });
    if (error) {
      setAccessStatus({ acesso_liberado: false, data_fim_acesso: null, plano_nome: 'Erro', mensagem: 'Erro de acesso' });
      return;
    }
    if (Array.isArray(data) && data.length > 0) setAccessStatus(data[0]);
  }, []);

  const fetchStoreData = useCallback(async (userId: string) => {
    setStoreStatus('loading');
    try {
      let storeId: string | null = null;
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      if (ownerStore) {
        storeId = ownerStore.id;
      } else {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        if (memberEntry) storeId = memberEntry.store_id;
      }

      if (!storeId) {
        setStoreStatus('none');
        return;
      }

      await fetchAccessStatus(storeId);
      const { data: storeDetails } = await supabase.from('stores').select('*').eq('id', storeId).single();
      
      const [productsRes, salesRes, cashRes] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
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
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          fetchStoreData(sessionUser.id);
        }
        setLoading(false);
      } catch (error) {
        console.error('[AUTH] erro ao iniciar sessão:', error);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        const newUser = session?.user ?? null;
        setUser(newUser);
        if (newUser) {
          fetchStoreData(newUser.id);
        } else {
          setStore(null);
          setStoreStatus('unknown');
          setProducts([]);
          setSales([]);
          setCashRegistersState([]);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStoreData]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    setStoreStatus('unknown');
  };

  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_user_account');
    if (!error) await logout();
    return { error };
  };

  // Funções de data (mantidas para compatibilidade com o resto do sistema)
  const createStore = async (data: any) => {
    const { data: newStore } = await supabase.rpc('create_new_store', data).select().single();
    if (newStore) await fetchStoreData(user!.id);
    return newStore as Store;
  };

  const updateStore = async (data: any) => {
    if (store) {
      await supabase.from('stores').update(data).eq('id', store.id);
      await fetchStoreData(user!.id);
    }
  };

  const updateUser = async (data: any) => {
    if (user) await supabase.from('users').update(data).eq('id', user.id);
  };

  const removeStoreMember = async (userId: string) => {
    const { error } = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store!.id);
    if (!error) await fetchStoreData(user!.id);
    return { error };
  };

  const addProduct = async (product: any) => {
    await supabase.from('products').insert({ ...product, store_id: store!.id });
    await fetchStoreData(user!.id);
  };

  const addCustomer = async (customer: any) => {
    await supabase.from('customers').insert({ ...customer, store_id: store!.id });
    await fetchStoreData(user!.id);
  };

  const updateProduct = async (id: string, product: any) => {
    await supabase.from('products').update(product).eq('id', id);
    await fetchStoreData(user!.id);
  };

  const updateProductStock = async (id: string, qty: number) => {
    await supabase.from('products').update({ stock_qty: qty }).eq('id', id);
    await fetchStoreData(user!.id);
  };

  const removeProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    await fetchStoreData(user!.id);
  };

  const findProductByBarcode = async (barcode: string) => {
    const { data } = await supabase.from('products').select('*').eq('store_id', store!.id).eq('barcode', barcode).maybeSingle();
    return data;
  };

  const setCashRegisters = async (action: any) => {
    const next = typeof action === 'function' ? action(cashRegisters) : action;
    for (const cr of next) {
      if (cashRegisters.find(c => c.id === cr.id)) {
        await supabase.from('cash_registers').update(cr).eq('id', cr.id);
      } else {
        await supabase.from('cash_registers').insert({ ...cr, store_id: store!.id });
      }
    }
    await fetchStoreData(user!.id);
  };

  const addSale = async (cart: CartItem[], paymentMethod: any) => {
    const total = cart.reduce((s, i) => s + i.subtotal_cents, 0);
    const { data: sale } = await supabase.from('sales').insert({ store_id: store!.id, total_cents: total, payment_method: paymentMethod }).select().single();
    if (sale) {
      for (const item of cart) {
        await supabase.from('sale_items').insert({ sale_id: sale.id, ...item });
        await supabase.rpc('decrement_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
      }
      await fetchStoreData(user!.id);
      return sale as Sale;
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, store, storeStatus, storeError, accessStatus, products, sales, cashRegisters,
      fetchStoreData, createStore, updateStore, updateUser, removeStoreMember, addProduct, addCustomer,
      updateProduct, updateProductStock, removeProduct, findProductByBarcode, setCashRegisters, addSale,
      logout, deleteAccount
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
