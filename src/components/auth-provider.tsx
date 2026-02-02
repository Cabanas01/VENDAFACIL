'use client';

/**
 * @fileOverview AuthProvider (DATA SYNC & REVALIDATION)
 * 
 * Responsável por manter os dados da loja em sincronia e revalidar o status 
 * de acesso após pagamentos assíncronos via Webhook.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { 
  Store, 
  Product, 
  Sale, 
  CashRegister, 
  StoreAccessStatus,
  CartItem,
  Customer,
  User
} from '@/lib/types';
import { processSaleAction } from '@/app/actions/sales-actions';

type AuthContextType = {
  user: User | null;
  store: Store | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  cashRegisters: CashRegister[];
  storeStatus: 'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error';
  
  refreshStatus: () => Promise<void>;
  createStore: (storeData: any) => Promise<void>;
  updateStore: (data: any) => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: any }>;
  addProduct: (product: any) => Promise<void>;
  addCustomer: (customer: any) => Promise<void>;
  updateProduct: (id: string, product: any) => Promise<void>;
  updateProductStock: (id: string, qty: number) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  findProductByBarcode: (barcode: string) => Promise<Product | null>;
  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card' | 'dinheiro' | 'cartao') => Promise<any>;
  setCashRegisters: (action: any) => Promise<void>;
  deleteAccount: () => Promise<{ error: any }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [storeStatus, setStoreStatus] = useState<'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error'>('loading_auth');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAppData = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        storeId = memberEntry?.store_id;
      }

      if (storeId) {
        const [accessRes, storeRes, prodRes, salesRes, cashRes, custRes] = await Promise.all([
          supabase.rpc('get_store_access_status', { p_store_id: storeId }),
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('products').select('*').eq('store_id', storeId).order('name'),
          supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
          supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
          supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
        ]);

        setAccessStatus(accessRes.data?.[0] || null);
        setStore(storeRes.data || null);
        setProducts(prodRes.data || []);
        setSales(salesRes.data || []);
        setCashRegistersState(cashRes.data || []);
        setCustomers(custRes.data || []);
        setStoreStatus('ready');
      } else {
        setStoreStatus('no_store');
      }
    } catch (err) {
      console.error('[CLIENT_SYNC_ERROR]', err);
      setStoreStatus('error');
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (user?.id) {
      await fetchAppData(user.id);
    }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        fetchAppData(session.user.id);
      } else {
        setUser(null);
        setStore(null);
        setStoreStatus('no_store');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAppData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isBillingPath = pathname?.includes('/billing') || pathname?.includes('/admin/billing');
    
    if (isBillingPath && user?.id && storeStatus === 'ready') {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(refreshStatus, 30000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pathname, user?.id, storeStatus, refreshStatus]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const createStore = async (storeData: any) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new Error('Sessão expirada.');

    await supabase.from('users').upsert({ id: authUser.id, email: authUser.email }, { onConflict: 'id' });

    const { error: rpcError } = await supabase.rpc('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: {
        cep: storeData.cep,
        street: storeData.street,
        number: storeData.number,
        neighborhood: storeData.neighborhood,
        city: storeData.city,
        state: storeData.state,
      },
      p_phone: storeData.phone,
      p_timezone: storeData.timezone || 'America/Sao_Paulo',
    });

    if (rpcError) throw rpcError;
    window.location.href = '/dashboard';
  };

  const addSale = useCallback(async (cart: CartItem[], method: any) => {
    if (!store?.id) throw new Error('Loja não identificada.');
    
    // Normalização de métodos legados para o padrão do PDV
    const normalizedMethod = method === 'dinheiro' ? 'cash' : (method === 'cartao' ? 'card' : method);
    
    const result = await processSaleAction(store.id, cart, normalizedMethod);
    if (!result.success) throw new Error(result.error);
    await refreshStatus();
    return result; // Retorna o objeto da venda completo para impressão imediata
  }, [store, refreshStatus]);

  const updateStore = async (data: any) => { if (store) { await supabase.from('stores').update(data).eq('id', store.id); await refreshStatus(); } };
  const updateUser = async (data: any) => { if (user) { await supabase.from('users').update(data).eq('id', user.id); await refreshStatus(); } };
  const addProduct = async (p: any) => { if (store) { await supabase.from('products').insert({ ...p, store_id: store.id }); await refreshStatus(); } };
  const addCustomer = async (c: any) => { if (store) { await supabase.from('customers').insert({ ...c, store_id: store.id }); await refreshStatus(); } };
  const updateProduct = async (id: string, p: any) => { await supabase.from('products').update(p).eq('id', id); await refreshStatus(); };
  const updateProductStock = async (id: string, q: number) => { await supabase.from('products').update({ stock_qty: q }).eq('id', id); await refreshStatus(); };
  const removeProduct = async (id: string) => { await supabase.from('products').delete().eq('id', id); await refreshStatus(); };
  const removeStoreMember = async (uid: string) => { const r = await supabase.from('store_members').delete().eq('user_id', uid); await refreshStatus(); return r; };
  const findProductByBarcode = async (b: string) => { if (!store) return null; const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('barcode', b).maybeSingle(); return data; };
  const setCashRegisters = async (action: any) => { if (!store) return; const next = typeof action === 'function' ? action(cashRegisters) : action; for (const cr of next) { if (cashRegisters.find(c => c.id === cr.id)) await supabase.from('cash_registers').update(cr).eq('id', cr.id); else await supabase.from('cash_registers').insert({ ...cr, store_id: store.id }); } await refreshStatus(); };
  const deleteAccount = async () => { const r = await supabase.rpc('delete_user_account'); if (!r.error) await logout(); return r; };

  return (
    <AuthContext.Provider value={{ 
      user, store, accessStatus, products, sales, customers, cashRegisters, storeStatus,
      refreshStatus, createStore, updateStore, updateUser, removeStoreMember,
      addProduct, addCustomer, updateProduct, updateProductStock, removeProduct,
      findProductByBarcode, addSale, setCashRegisters, deleteAccount, logout 
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
