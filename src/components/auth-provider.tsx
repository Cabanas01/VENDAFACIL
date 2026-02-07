'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ComandaService } from '@/lib/rpc';
import type { 
  Store, 
  Product, 
  Sale, 
  CashSession, 
  StoreAccessStatus,
  Customer,
  User
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  store: Store | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  comandas: Sale[];
  sales: Sale[];
  customers: Customer[];
  cashSessions: CashSession[];
  storeStatus: 'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error';
  
  refreshStatus: () => Promise<void>;
  createStore: (storeData: any) => Promise<void>;
  addCustomer: (customerData: Partial<Customer>) => Promise<void>;
  
  getOrCreateComanda: (table: number, customerName?: string | null) => Promise<string>;
  adicionarItem: (comandaId: string, productId: string, quantity: number) => Promise<void>;
  finalizarAtendimento: (comandaId: string, method: 'cash' | 'pix' | 'card') => Promise<void>;
  concluirPreparo: (itemId: string) => Promise<void>;
  
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [activeComandas, setActiveComandas] = useState<Sale[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [storeStatus, setStoreStatus] = useState<'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error'>('loading_auth');

  const fetchAppData = useCallback(async (userId: string) => {
    try {
      setStoreStatus('loading_status');
      
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        storeId = memberEntry?.store_id;
      }

      if (storeId) {
        const [
          storeRes, 
          prodRes, 
          comandasRes, 
          custRes, 
          historyRes, 
          cashRes,
          accessRes
        ] = await Promise.all([
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('products').select('*').eq('store_id', storeId).order('name'),
          supabase.from('comandas').select('*, items:order_items(*)').eq('store_id', storeId).eq('status', 'open').order('created_at', { ascending: true }),
          supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
          supabase.from('sales').select('*, items:order_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(50),
          supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
          supabase.rpc('get_store_access_status', { p_store_id: storeId }).catch(() => ({ data: null }))
        ]);

        setStore(storeRes.data || null);
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        setActiveComandas(Array.isArray(comandasRes.data) ? comandasRes.data : []);
        setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
        setSalesHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
        
        // Mapear cash_registers para o formato esperado pela UI (cashSessions)
        const mappedSessions: CashSession[] = (cashRes.data || []).map(r => ({
          id: r.id,
          store_id: r.store_id,
          opened_at: r.opened_at,
          closed_at: r.closed_at,
          opening_amount_cents: r.opening_amount_cents || r.opening_amount || 0,
          closing_amount_cents: r.closing_amount_cents || r.closing_amount || null,
          status: r.status as 'open' | 'closed'
        }));
        
        setCashSessions(mappedSessions);
        setAccessStatus(accessRes?.data?.[0] || null);
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
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (sessionUser) await fetchAppData(sessionUser.id);
  }, [fetchAppData]);

  const addCustomer = async (data: Partial<Customer>) => {
    if (!store?.id) return;
    const { error } = await supabase.from('customers').insert([{
      ...data,
      store_id: store.id
    }]);
    if (error) throw error;
    await refreshStatus();
  };

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

  const getOrCreateComanda = async (table: number, customerName: string | null = null) => {
    if (!store?.id) throw new Error('Unidade não identificada.');
    return ComandaService.getOrCreateComanda(table, customerName);
  };

  const adicionarItem = async (comandaId: string, productId: string, quantity: number) => {
    await ComandaService.adicionarItem(comandaId, productId, quantity);
  };

  const finalizarAtendimento = async (comandaId: string, method: 'cash' | 'pix' | 'card') => {
    await ComandaService.finalizarAtendimento(comandaId, method);
  };

  const concluirPreparo = async (itemId: string) => {
    await ComandaService.concluirPreparo(itemId);
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
      user, store, accessStatus, products, comandas: activeComandas, customers, sales: salesHistory, cashSessions, storeStatus,
      refreshStatus, createStore, addCustomer, getOrCreateComanda, adicionarItem, finalizarAtendimento, concluirPreparo, logout 
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
