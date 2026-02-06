'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ComandaService } from '@/lib/rpc';
import type { 
  Store, 
  Product, 
  Comanda,
  CashRegister, 
  StoreAccessStatus,
  Customer,
  User
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  store: Store | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  comandas: Comanda[];
  customers: Customer[];
  cashRegisters: CashRegister[];
  storeStatus: 'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error';
  
  refreshStatus: () => Promise<void>;
  createStore: (storeData: any) => Promise<void>;
  
  // Interface do Provedor sincronizada com ComandaService v5.3
  getOrCreateComanda: (tableNumber: number, customerName: string | null) => Promise<string>;
  adicionarItem: (comandaId: string, productId: string, quantity: number) => Promise<void>;
  finalizarAtendimento: (comandaId: string, paymentMethod: 'dinheiro' | 'pix' | 'cartao') => Promise<void>;
  concluirPreparo: (itemId: string) => Promise<void>;
  
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
        // Leitura via Selects protegidos por RLS (Sem mutação REST)
        const [storeRes, prodRes, cmdRes, custRes, accessRes, cashRes] = await Promise.all([
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('products').select('*').eq('store_id', storeId).order('name'),
          supabase.from('comandas').select('*, items:comanda_items(*)').eq('store_id', storeId).eq('status', 'aberta').order('created_at', { ascending: true }),
          supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
          supabase.rpc('get_store_access_status', { p_store_id: storeId }),
          supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false })
        ]);

        setStore(storeRes.data || null);
        setProducts(prodRes.data || []);
        setComandas(cmdRes.data || []);
        setCustomers(custRes.data || []);
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

  const getOrCreateComanda = async (tableNumber: number, customerName: string | null) => {
    return ComandaService.getOrCreateComanda(tableNumber, customerName);
  };

  const adicionarItem = async (comandaId: string, productId: string, quantity: number) => {
    await ComandaService.adicionarItem(comandaId, productId, Number(quantity));
    await refreshStatus();
  };

  const finalizarAtendimento = async (comandaId: string, paymentMethod: 'dinheiro' | 'pix' | 'cartao') => {
    await ComandaService.finalizarAtendimento(comandaId, paymentMethod);
    await refreshStatus();
  };

  const concluirPreparo = async (itemId: string) => {
    await ComandaService.concluirPreparo(itemId);
    await refreshStatus();
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
      user, store, accessStatus, products, comandas, customers, cashRegisters, storeStatus,
      refreshStatus, createStore, getOrCreateComanda, adicionarItem, finalizarAtendimento, concluirPreparo, logout 
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
