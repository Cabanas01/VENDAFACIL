
'use client';

/**
 * @fileOverview AuthProvider (CONTRATO DE CONFORMIDADE ESTABELECIDO)
 * 
 * Sincronizado com o schema de banco de dados final que utiliza total_cents.
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
  addProduct: (product: any) => Promise<void>;
  addCustomer: (customer: any) => Promise<void>;
  addSale: (cart: CartItem[], method: any, customerId?: string | null) => Promise<any>;
  setCashRegisters: (action: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeAccessStatus(raw: any): StoreAccessStatus {
  const defaultStatus: StoreAccessStatus = {
    acesso_liberado: false,
    data_fim_acesso: null,
    plano_nome: 'Sem Plano',
    plano_tipo: null,
    mensagem: 'Seu acesso não está ativo.'
  };

  if (raw === null || raw === undefined) return defaultStatus;

  // No novo schema, o retorno é BOOLEAN direto ou um Record do tipo { acesso_liberado: boolean }
  if (typeof raw === 'boolean') {
    return {
      ...defaultStatus,
      acesso_liberado: raw,
      plano_nome: raw ? 'Plano Ativo' : 'Inativo',
      mensagem: raw ? 'Acesso liberado.' : 'Sua assinatura expirou.'
    };
  }

  const data = Array.isArray(raw) ? raw[0] : raw;
  if (typeof data === 'object') {
    return {
      acesso_liberado: !!data.acesso_liberado,
      data_fim_acesso: data.data_fim_acesso || null,
      plano_nome: data.plano_nome || (!!data.acesso_liberado ? 'Ativo' : 'Sem Plano'),
      plano_tipo: data.plano_tipo || null,
      mensagem: data.mensagem || (!!data.acesso_liberado ? 'Acesso liberado.' : 'Acesso restrito.')
    };
  }

  return defaultStatus;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [storeStatus, setStoreStatus] = useState<'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error'>('loading_auth');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchAppData = useCallback(async (userId: string) => {
    if (!userId || !UUID_REGEX.test(userId)) return;
    
    try {
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        storeId = memberEntry?.store_id;
      }

      if (storeId && UUID_REGEX.test(storeId)) {
        // 1. Validar Acesso
        const { data: accessData } = await supabase.rpc('get_store_access_status', { p_store_id: storeId });
        setAccessStatus(normalizeAccessStatus(accessData));

        // 2. Carga de Dados (Sincronizado com schema total_cents)
        const [storeRes, prodRes, salesRes, cashRes, custRes] = await Promise.all([
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('products').select('*').eq('store_id', storeId).order('name'),
          supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
          supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
          supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
        ]);

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

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const createStore = async (storeData: any) => {
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
      p_business_type: storeData.business_type || 'outros'
    });

    if (rpcError) throw rpcError;
    window.location.href = '/dashboard';
  };

  const addSale = useCallback(async (cart: CartItem[], method: any, customerId?: string | null) => {
    if (!store?.id) throw new Error('Loja não identificada.');
    const result = await processSaleAction(store.id, cart, method, customerId);
    if (!result.success) throw new Error(result.error);
    await refreshStatus();
    return result;
  }, [store, refreshStatus]);

  const updateStore = async (data: any) => { if (store) { await supabase.from('stores').update(data).eq('id', store.id); await refreshStatus(); } };
  const addProduct = async (p: any) => { if (store) { await supabase.from('products').insert({ ...p, store_id: store.id }); await refreshStatus(); } };
  const addCustomer = async (c: any) => { if (store) { await supabase.from('customers').insert({ ...c, store_id: store.id }); await refreshStatus(); } };
  const updateProduct = async (id: string, p: any) => { await supabase.from('products').update(p).eq('id', id); await refreshStatus(); };
  const updateProductStock = async (id: string, q: number) => { await supabase.from('products').update({ stock_qty: q }).eq('id', id); await refreshStatus(); };
  const removeProduct = async (id: string) => { await supabase.from('products').delete().eq('id', id); await refreshStatus(); };
  const findProductByBarcode = async (b: string) => { if (!store) return null; const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('barcode', b).maybeSingle(); return data; };
  const setCashRegisters = async (action: any) => { if (!store) return; const next = typeof action === 'function' ? action(cashRegisters) : action; for (const cr of next) { if (cashRegisters.find(c => c.id === cr.id)) await supabase.from('cash_registers').update(cr).eq('id', cr.id); else await supabase.from('cash_registers').insert({ ...cr, store_id: store.id }); } await refreshStatus(); };

  return (
    <AuthContext.Provider value={{ 
      user, store, accessStatus, products, sales, customers, cashRegisters, storeStatus,
      refreshStatus, createStore, updateStore, addProduct, addCustomer, updateProduct, 
      updateProductStock, removeProduct, findProductByBarcode, addSale, setCashRegisters, logout 
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
