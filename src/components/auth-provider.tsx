'use client';

/**
 * @fileOverview AuthProvider (Data Sync Only)
 * 
 * Sincroniza os dados do banco com o estado do cliente para uso em componentes.
 * NÃO realiza redirecionamentos ou lógica de roteamento.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { 
  Store, 
  Product, 
  Sale, 
  CashRegister, 
  BootstrapStatus,
  StoreAccessStatus,
  CartItem,
  Customer,
  User
} from '@/lib/types';
import { processSaleAction } from '@/app/actions/sales-actions';

type AuthContextType = {
  user: User | null;
  bootstrap: BootstrapStatus | null;
  store: Store | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  cashRegisters: CashRegister[];
  
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
  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<any>;
  setCashRegisters: (action: any) => Promise<void>;
  deleteAccount: () => Promise<{ error: any }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);
  
  const initialized = useRef(false);

  const fetchAppData = useCallback(async (userId: string) => {
    try {
      const { data: status } = await supabase.rpc('get_user_bootstrap_status');
      if (status) setBootstrap(status);

      if (status?.has_store || status?.is_member) {
        // Busca a loja ativa (Dono ou Membro)
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
          setStore(storeRes.data);
          setProducts(prodRes.data || []);
          setSales(salesRes.data || []);
          setCashRegistersState(cashRes.data || []);
          setCustomers(custRes.data || []);
        }
      }
    } catch (err) {
      console.error('[DATA_SYNC_ERROR]', err);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (sessionUser) await fetchAppData(sessionUser.id);
  }, [fetchAppData]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Inicialização da sessão
    supabase.auth.getUser().then(({ data: { user: sessionUser } }) => {
      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email || '' });
        fetchAppData(sessionUser.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        fetchAppData(session.user.id);
      } else {
        setUser(null);
        setBootstrap(null);
        setStore(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchAppData]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const createStore = async (storeData: any) => {
    const { error } = await supabase.rpc('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone || 'America/Sao_Paulo',
    });
    if (error) throw error;
    // O AppLayout (Server) detectará a nova loja e mudará a rota
    window.location.href = '/dashboard';
  };

  const addSale = useCallback(async (cart: CartItem[], method: any) => {
    if (!store?.id) throw new Error('Loja não identificada.');
    const result = await processSaleAction(store.id, cart, method);
    if (!result.success) throw new Error(result.error);
    await refreshStatus();
    return result;
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
      user, bootstrap, store, accessStatus, products, sales, customers, cashRegisters,
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
