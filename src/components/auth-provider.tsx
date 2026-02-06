
'use client';

/**
 * @fileOverview AuthProvider - Motor de Dados Sincronizado v3.0.
 * Centraliza toda a lógica de escrita via RPCs Oficiais (Schema Public).
 * Seguindo estritamente o mapeamento definitivo do backend.
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
  ComandaTotalView,
  OrderItem
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  store: Store | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  comandas: ComandaTotalView[];
  sales: Sale[];
  customers: Customer[];
  cashRegisters: CashRegister[];
  storeStatus: 'loading_auth' | 'loading_status' | 'ready' | 'no_store' | 'error';
  
  refreshStatus: () => Promise<void>;
  createStore: (storeData: any) => Promise<void>;
  
  abrirComanda: (mesa: string, cliente: string) => Promise<string>;
  adicionarItem: (comandaId: string, productId: string, quantity: number, unitPrice?: number) => Promise<void>;
  fecharComanda: (comandaId: string, paymentMethodId: string, cashRegisterId?: string) => Promise<void>;
  marcarItemConcluido: (itemId: string) => Promise<void>;
  addSale: (cart: CartItem[], paymentMethod: string) => Promise<Sale | null>;
  
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [comandas, setComandas] = useState<ComandaTotalView[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);
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
        // Busca de dados normalizada usando nomes de colunas oficiais
        const [storeRes, prodRes, cmdRes, custRes, accessRes, salesRes, cashRes] = await Promise.all([
          supabase.from('stores').select('*').eq('id', storeId).single(),
          supabase.from('products').select('*').eq('store_id', storeId).order('name'),
          supabase.from('comandas').select('*').eq('store_id', storeId).eq('status', 'aberta').order('numero', { ascending: true }),
          supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
          supabase.rpc('get_store_access_status', { p_store_id: storeId }),
          supabase.from('sales').select('*, items:order_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(50),
          supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false })
        ]);

        setStore(storeRes.data || null);
        setProducts(prodRes.data || []);
        
        // No frontend, tratamos as comandas abertas como nossa view principal
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

  const abrirComanda = async (mesa: string, cliente: string) => {
    if (!store?.id) throw new Error('Contexto de loja ausente.');
    
    // Inserção direta conforme mapeamento: Insere em comandas com status aberta
    const { data, error } = await supabase
      .from('comandas')
      .insert({
        store_id: store.id,
        mesa: mesa.toString(),
        cliente_nome: cliente || 'Consumidor',
        status: 'aberta'
      })
      .select('id')
      .single();

    if (error) throw error;
    await refreshStatus();
    return data.id; 
  };

  const adicionarItem = async (comandaId: string, productId: string, quantity: number, unitPrice?: number) => {
    // RPC Oficial: p_unit_price é obrigatório (cents ou null)
    const { error } = await supabase.rpc('rpc_add_item_to_comanda', {
      p_comanda_id: comandaId,
      p_product_id: productId,
      p_quantity: Math.floor(quantity),
      p_unit_price: unitPrice ?? null
    });

    if (error) throw error;
    await refreshStatus();
  };

  const fecharComanda = async (comandaId: string, paymentMethodId: string, cashRegisterId?: string) => {
    // RPC Oficial: rpc_close_comanda_to_sale (fechamento atômico)
    const { error } = await supabase.rpc('rpc_close_comanda_to_sale', {
      p_comanda_id: comandaId,
      p_payment_method_id: paymentMethodId,
      p_cash_register_id: cashRegisterId ?? null
    });

    if (error) throw error;
    await refreshStatus();
  };

  const addSale = async (cart: CartItem[], paymentMethod: string) => {
    if (!store?.id) throw new Error('Loja não identificada.');
    try {
      // Fluxo Seguro: Comanda '0' (PDV) -> RPC Adicionar -> RPC Fechar
      const comandaId = await abrirComanda('0', 'Consumidor Final');
      
      for (const item of cart) {
        await adicionarItem(comandaId, item.product_id, item.qty, item.unit_price_cents);
      }
      
      await fecharComanda(comandaId, paymentMethod);
      
      const { data: lastSale } = await supabase
        .from('sales')
        .select('*, items:order_items(*)')
        .eq('comanda_id', comandaId)
        .maybeSingle();
        
      return lastSale as Sale;
    } catch (err: any) {
      console.error('[PDV_FLOW_ERROR]', err);
      throw err;
    }
  };

  const marcarItemConcluido = async (itemId: string) => {
    // RPC Oficial: rpc_mark_order_item_done
    const { error } = await supabase.rpc('rpc_mark_order_item_done', { 
      p_item_id: itemId 
    });
    if (error) throw error;
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
      user, store, accessStatus, products, comandas, customers, sales, cashRegisters, storeStatus,
      refreshStatus, createStore, abrirComanda, adicionarItem, fecharComanda, marcarItemConcluido, addSale, logout 
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
