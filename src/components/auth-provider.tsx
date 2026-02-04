
'use client';

/**
 * @fileOverview AuthProvider - Fonte Única da Verdade para o Frontend.
 * Sincronizado para usar estritamente o fluxo de Comandas do Backend.
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
  ComandaTotalView
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  store: Store | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  comandas: ComandaTotalView[];
  customers: Customer[];
  storeStatus: 'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error';
  
  refreshStatus: () => Promise<void>;
  createStore: (storeData: any) => Promise<void>;
  abrirComanda: (mesa: string, cliente: string) => Promise<string>;
  adicionarItem: (comandaId: string, productId: string, quantity: number) => Promise<void>;
  fecharComanda: (comandaId: string, formaPagamento: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [comandas, setComandas] = useState<ComandaTotalView[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
        const [storeRes, prodRes, cmdRes, custRes, accessRes] = await Promise.all([
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('products').select('*').eq('store_id', storeId).order('name'),
          supabase.from('v_comandas_totais').select('*').eq('store_id', storeId).neq('status', 'fechada'),
          supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
          supabase.rpc('get_store_access_status', { p_store_id: storeId })
        ]);

        setStore(storeRes.data || null);
        setProducts(prodRes.data || []);
        setComandas(cmdRes.data || []);
        setCustomers(custRes.data || []);
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

  const abrirComanda = async (mesa: string, cliente: string) => {
    if (!store?.id) throw new Error('Loja não identificada.');
    const { data, error } = await supabase.rpc('abrir_comanda', {
      p_store_id: store.id,
      p_mesa: mesa,
      p_cliente_nome: cliente
    });
    if (error) throw error;
    await refreshStatus();
    return data; // Retorna o UUID da comanda
  };

  const adicionarItem = async (comandaId: string, productId: string, quantity: number) => {
    const { error } = await supabase.rpc('adicionar_item_comanda', {
      p_comanda_id: comandaId,
      p_product_id: productId,
      p_quantity: quantity
    });
    if (error) throw error;
    await refreshStatus();
  };

  const fecharComanda = async (comandaId: string, formaPagamento: string) => {
    const { error } = await supabase.rpc('fechar_comanda', {
      p_comanda_id: comandaId,
      p_forma_pagamento: formaPagamento
    });
    if (error) throw error;
    await refreshStatus();
  };

  const createStore = async (storeData: any) => {
    const { error } = await supabase.rpc('create_new_store', { ...storeData });
    if (error) throw error;
    window.location.href = '/dashboard';
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, store, accessStatus, products, comandas, customers, storeStatus,
      refreshStatus, createStore, abrirComanda, adicionarItem, fecharComanda, logout 
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
