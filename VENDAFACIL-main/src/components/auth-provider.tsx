'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  getOpenSaleRpc, 
  addItemToSaleRpc, 
  closeSaleRpc,
  markItemDoneRpc
} from '@/lib/rpc';
import type { 
  Store, 
  Product, 
  Sale, 
  CashRegister, 
  StoreAccessStatus,
  CartItem,
  Customer,
  User,
  ProductionSnapshotView
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  store: Store | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  comandas: Sale[];
  sales: Sale[];
  customers: Customer[];
  cashRegisters: CashRegister[];
  storeStatus: 'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error';
  
  refreshStatus: () => Promise<void>;
  createStore: (storeData: any) => Promise<void>;
  
  getOpenSale: (tableNumber: number, customerName: string | null) => Promise<string>;
  adicionarItem: (saleId: string, productId: string, quantity: number) => Promise<void>;
  fecharVenda: (saleId: string, paymentMethod: string) => Promise<void>;
  addSaleBalcao: (cart: CartItem[], paymentMethod: string, customerName: string) => Promise<Sale | null>;
  marcarItemConcluido: (itemId: string) => Promise<void>;
  
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [comandas, setComandas] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);
  const [storeStatus, setStoreStatus] = useState<'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error'>('loading_auth');

  const fetchAppData = useCallback(async (userId: string) => {
    setStoreStatus('loading_status');
    try {
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        storeId = memberEntry?.store_id;
      }

      if (storeId) {
        const [storeRes, prodRes, cmdRes, custRes, accessRes, salesRes, cashRes] = await Promise.all([
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('products').select('*').eq('store_id', storeId).order('name'),
          supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).eq('status', 'open').order('created_at', { ascending: true }),
          supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
          supabase.rpc('get_store_access_status', { p_store_id: storeId }),
          supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).eq('status', 'paid').order('created_at', { ascending: false }).limit(50),
          supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false })
        ]);

        setStore(storeRes.data || null);
        setProducts(prodRes.data || []);
        setComandas(cmdRes.data || []);
        setCustomers(custRes.data || []);
        setSales(salesRes.data || []);
        setCashRegistersState(cashRes.data || []);
        setAccessStatus(accessRes.data?.[0] || null);
        setStoreStatus('ready');
      } else {
        setStoreStatus('no_store');
      }
    } catch (err) {
      console.error('[AUTH_SYNC_FATAL]', err);
      setStoreStatus('error');
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (user?.id) await fetchAppData(user.id);
  }, [user?.id, fetchAppData]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: sessionUser } }) => {
      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email || '' });
        fetchAppData(sessionUser.id);
      } else {
        setStoreStatus('no_store');
      }
    });
  }, [fetchAppData]);

  const getOpenSale = async (tableNumber: number, customerName: string | null) => {
    if (!store?.id) throw new Error('Unidade não identificada.');
    return getOpenSaleRpc(store.id, tableNumber, customerName);
  };

  const adicionarItem = async (saleId: string, productId: string, quantity: number) => {
    await addItemToSaleRpc(saleId, productId, quantity);
  };

  const fecharVenda = async (saleId: string, paymentMethod: string) => {
    await closeSaleRpc(saleId, paymentMethod);
    await refreshStatus();
  };

  const addSaleBalcao = async (cart: CartItem[], paymentMethod: string, customerName: string) => {
    if (!store?.id) throw new Error('Unidade não identificada.');
    const saleId = await getOpenSaleRpc(store.id, 0, customerName);
    for (const item of cart) {
      await addItemToSaleRpc(saleId, item.product_id, item.qty);
    }
    await closeSaleRpc(saleId, paymentMethod);
    const { data: finalSale } = await supabase.from('sales').select('*, items:sale_items(*)').eq('id', saleId).single();
    await refreshStatus();
    return finalSale as Sale;
  };

  const marcarItemConcluido = async (itemId: string) => {
    await markItemDoneRpc(itemId);
  };

  const createStore = async (storeData: any) => {
    const { error } = await supabase.rpc('create_new_store', { 
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone
    });
    if (error) throw error;
    window.location.href = '/dashboard';
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, store, accessStatus, products, comandas, customers, sales, cashRegisters, storeStatus,
      refreshStatus, createStore, getOpenSale, adicionarItem, fecharVenda, addSaleBalcao, marcarItemConcluido, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
