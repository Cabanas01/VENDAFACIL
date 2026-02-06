'use client';

/**
 * @fileOverview AuthProvider - Backend v4.0 Sync.
 * Implementa as novas RPCs: rpc_add_item_to_sale, rpc_close_sale, rpc_mark_item_done, rpc_get_open_sale.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
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
  productionQueue: ProductionSnapshotView[];
  storeStatus: 'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error';
  
  refreshStatus: () => Promise<void>;
  createStore: (storeData: any) => Promise<void>;
  
  getOpenSale: (mesa: string) => Promise<string | null>;
  adicionarItem: (saleId: string, productId: string, quantity: number) => Promise<void>;
  fecharVenda: (saleId: string, paymentMethodId: string, cashRegisterId?: string) => Promise<void>;
  marcarItemConcluido: (itemId: string) => Promise<void>;
  addSaleBalcao: (cart: CartItem[], paymentMethod: string) => Promise<Sale | null>;
  
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
  const [productionQueue, setProductionQueue] = useState<ProductionSnapshotView[]>([]);
  const [storeStatus, setStoreStatus] = useState<'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error'>('loading_auth');

  const fetchAppData = useCallback(async (userId: string) => {
    try {
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        storeId = memberEntry?.store_id;
      }

      if (storeId) {
        const [storeRes, prodRes, cmdRes, custRes, accessRes, salesRes, cashRes, queueRes] = await Promise.all([
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('products').select('*').eq('store_id', storeId).order('name'),
          supabase.from('sales').select('*').eq('store_id', storeId).eq('status', 'open').order('created_at', { ascending: true }),
          supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
          supabase.rpc('get_store_access_status', { p_store_id: storeId }),
          supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).eq('status', 'paid').order('created_at', { ascending: false }).limit(50),
          supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
          supabase.from('production_snapshot').select('*').eq('store_id', storeId)
        ]);

        setStore(storeRes.data || null);
        setProducts(prodRes.data || []);
        setComandas(cmdRes.data || []);
        setCustomers(custRes.data || []);
        setSales(salesRes.data || []);
        setCashRegistersState(cashRes.data || []);
        setProductionQueue(queueRes.data || []);
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

  const getOpenSale = async (mesa: string) => {
    const { data, error } = await supabase.rpc('rpc_get_open_sale', { p_mesa: mesa });
    if (error) throw error;
    return data; // Retorna sale_id ou null
  };

  const adicionarItem = async (saleId: string, productId: string, quantity: number) => {
    const { error } = await supabase.rpc('rpc_add_item_to_sale', {
      p_sale_id: saleId,
      p_product_id: productId,
      p_quantity: Math.floor(quantity),
      p_unit_price: null // Banco resolve
    });

    if (error) throw error;
    await refreshStatus();
  };

  const fecharVenda = async (saleId: string, paymentMethodId: string, cashRegisterId?: string) => {
    const { error } = await supabase.rpc('rpc_close_sale', {
      p_sale_id: saleId,
      p_payment_method_id: paymentMethodId,
      p_cash_register_id: cashRegisterId ?? null
    });

    if (error) throw error;
    await refreshStatus();
  };

  const marcarItemConcluido = async (itemId: string) => {
    const { error } = await supabase.rpc('rpc_mark_item_done', { p_item_id: itemId });
    if (error) throw error;
    await refreshStatus();
  };

  const addSaleBalcao = async (cart: CartItem[], paymentMethod: string) => {
    if (!store?.id) throw new Error('Loja não identificada.');
    
    try {
      // No PDV de balcão, criamos um sale "open" na mesa "0" e fechamos em seguida
      const { data: saleId, error: openErr } = await supabase.from('sales').insert({
        store_id: store.id,
        status: 'open',
        mesa: '0',
        cliente_nome: 'Consumidor Final'
      }).select('id').single();

      if (openErr) throw openErr;

      for (const item of cart) {
        await adicionarItem(saleId.id, item.product_id, item.qty);
      }

      await fecharVenda(saleId.id, paymentMethod);
      
      const { data: lastSale } = await supabase
        .from('sales')
        .select('*, items:sale_items(*)')
        .eq('id', saleId.id)
        .single();
        
      return lastSale as Sale;
    } catch (err: any) {
      console.error('[PDV_BALCAO_ERROR]', err);
      throw err;
    }
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
      user, store, accessStatus, products, comandas, customers, sales, cashRegisters, productionQueue, storeStatus,
      refreshStatus, createStore, getOpenSale, adicionarItem, fecharVenda, marcarItemConcluido, addSaleBalcao, logout 
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
