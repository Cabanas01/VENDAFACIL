
'use client';

/**
 * @fileOverview AuthProvider (MOTOR DE ESTADO PASSIVO)
 * 
 * Sincroniza sessão e dados do tenant. 
 * NÃO executa navegação (Regra de Ouro).
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { 
  Store, 
  Product, 
  Sale, 
  CashRegister, 
  StoreStatus, 
  StoreAccessStatus,
  CartItem,
  Customer,
  SaleItem
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean; 
  store: Store | null;
  storeStatus: StoreStatus;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  cashRegisters: CashRegister[];
  
  fetchStoreData: (userId: string, silent?: boolean) => Promise<void>;
  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (data: any) => Promise<void>;
  updateUser: (data: any) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: any }>;
  addProduct: (product: any) => Promise<void>;
  addCustomer: (customer: any) => Promise<void>;
  updateProduct: (id: string, product: any) => Promise<void>;
  updateProductStock: (id: string, qty: number) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  findProductByBarcode: (barcode: string) => Promise<Product | null>;
  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<Sale | null>;
  setCashRegisters: (action: any) => Promise<void>;
  deleteAccount: () => Promise<{ error: any }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); 
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('loading_auth');
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchStoreData = useCallback(async (userId: string, silent: boolean = false) => {
    if (!userId) return;
    if (!silent) setStoreStatus('loading_store');
    
    try {
      const { data: ownerStore, error: ownerError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerError) {
        if (!silent) setStoreStatus('error');
        return;
      }

      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (memberError) {
          if (!silent) setStoreStatus('error');
          return;
        }
        storeId = memberEntry?.store_id;
      }

      if (!storeId) {
        setStore(null);
        if (!silent) setStoreStatus('no_store');
        return;
      }

      const [statusRes, storeRes, productsRes, salesRes, cashRes, customersRes] = await Promise.all([
        supabase.rpc('get_store_access_status', { p_store_id: storeId }),
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
      ]);

      if (storeRes.error) throw storeRes.error;

      setAccessStatus(statusRes.data?.[0] || null);
      setStore(storeRes.data as Store);
      setProducts(productsRes.data as Product[] || []);
      setSales(salesRes.data as Sale[] || []);
      setCustomers(customersRes.data as Customer[] || []);
      setCashRegistersState(cashRes.data as CashRegister[] || []);
      
      if (!silent) setStoreStatus('has_store');

    } catch (err) {
      console.error('[AUTH_PROVIDER] Sync error:', err);
      if (!silent) setStoreStatus('error');
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      setUser(sessionUser);
      setLoading(false);

      if (sessionUser) {
        fetchStoreData(sessionUser.id);
      } else {
        setStoreStatus('no_store'); 
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        fetchStoreData(newUser.id);
      } else {
        setStore(null);
        setStoreStatus('no_store');
        setAccessStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchStoreData]);

  const createStore = useCallback(async (storeData: any) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) throw new Error('Usuário não autenticado.');

    const { data, error } = await supabase.rpc('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone || 'America/Sao_Paulo',
    });

    if (error) {
      console.error('[AUTH_PROVIDER] RPC create_new_store failed:', error);
      throw error;
    }

    await fetchStoreData(currentUser.id);
    return data as Store;
  }, [fetchStoreData]);

  const updateStore = useCallback(async (data: any) => {
    if (!store || !user) return;
    await supabase.from('stores').update(data).eq('id', store.id);
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const updateUser = useCallback(async (data: any) => {
    if (!user) return;
    await supabase.from('users').update(data).eq('id', user.id);
  }, [user]);

  const removeStoreMember = useCallback(async (userId: string) => {
    if (!store || !user) return { error: new Error('Sessão inválida') };
    const { error } = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
    if (!error) await fetchStoreData(user.id, true);
    return { error };
  }, [store, user, fetchStoreData]);

  const addProduct = useCallback(async (product: any) => {
    if (!store || !user) return;
    await supabase.from('products').insert({ ...product, store_id: store.id });
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const addCustomer = useCallback(async (customer: any) => {
    if (!store || !user) return;
    const { error } = await supabase.from('customers').insert({ ...customer, store_id: store.id });
    if (error) throw error;
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const updateProduct = useCallback(async (id: string, product: any) => {
    if (!store || !user) return;
    await supabase.from('products').update(product).eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const updateProductStock = useCallback(async (id: string, qty: number) => {
    if (!store || !user) return;
    await supabase.from('products').update({ stock_qty: qty }).eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const removeProduct = useCallback(async (id: string) => {
    if (!store || !user) return;
    await supabase.from('products').delete().eq('id', id).eq('store_id', store.id);
    await fetchStoreData(user.id, true);
  }, [store, user, fetchStoreData]);

  const findProductByBarcode = useCallback(async (barcode: string) => {
    if (!store) return null;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('barcode', barcode).maybeSingle();
    return data as Product || null;
  }, [store]);

  const addSale = useCallback(async (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => {
    /**
     * CORREÇÃO DEFINITIVA: Sincronização Estrita de Identidade
     * O getUser() garante que o Supabase Client envie o token correto nos headers.
     */
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error('[SALE_ABORTED] Falha na sincronização de identidade:', userError);
      throw new Error('Sua sessão expirou. Por favor, entre novamente para continuar.');
    }

    const currentUser = userData.user;
    const currentStore = store;

    if (!currentStore) {
      throw new Error('Loja não identificada. Por favor, recarregue a página.');
    }

    console.log('[SALE_IDENTIDADE_SYNC] User ID:', currentUser.id);
    
    const total = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);

    // ETAPA 1: Inserir o cabeçalho da venda (Sales)
    const { data: createdSale, error: saleError } = await supabase
      .from('sales')
      .insert({ 
        store_id: currentStore.id, 
        total_cents: total, 
        payment_method: paymentMethod 
      })
      .select()
      .single();

    if (saleError || !createdSale) {
      console.error('[SALE_DB_ERROR]', saleError);
      const msg = saleError?.message || '';
      
      if (msg.includes('trial_sales_limit')) {
        throw new Error('Limite de 5 vendas do plano de avaliação atingido. Faça o upgrade para continuar.');
      }
      
      if (msg.includes('security policy') || msg.includes('RLS')) {
        throw new Error('Acesso negado. Sua identidade não foi reconhecida pelo banco ou seu plano expirou.');
      }
      
      throw new Error(msg || 'Falha técnica ao registrar a venda.');
    }

    try {
      // ETAPA 2: Inserir itens vinculados ao ID real retornado
      const itemsToInsert = cart.map(item => ({
        sale_id: createdSale.id, 
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        product_barcode_snapshot: item.product_barcode_snapshot || null,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        subtotal_cents: item.subtotal_cents
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // ETAPA 3: Baixa de estoque
      for (const item of cart) {
        await supabase.rpc('decrement_stock', { 
          p_product_id: item.product_id, 
          p_quantity: item.quantity 
        });
      }

      // Sincronização Silenciosa
      fetchStoreData(currentUser.id, true).catch(err => console.warn('[POST_SALE_SYNC_WARN]', err));
      
      return createdSale as Sale;

    } catch (err: any) {
      console.error('[SALE_CRITICAL_FAILURE]', err);
      // Rollback manual do cabeçalho caso os itens falhem
      await supabase.from('sales').delete().eq('id', createdSale.id);
      throw new Error('Erro ao processar os itens da venda. A operação foi cancelada.');
    }
  }, [store, fetchStoreData]);

  const setCashRegisters = useCallback(async (action: any) => {
    if (!store || !user) return;
    const next = typeof action === 'function' ? action(cashRegisters) : action;
    for (const cr of next) {
      if (cashRegisters.find(c => c.id === cr.id)) {
        await supabase.from('cash_registers').update(cr).eq('id', cr.id);
      } else {
        await supabase.from('cash_registers').insert({ ...cr, store_id: store.id });
      }
    }
    await fetchStoreData(user.id, true);
  }, [store, user, cashRegisters, fetchStoreData]);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_user_account');
    return { error };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, store, storeStatus, accessStatus, products, sales, customers, cashRegisters,
      fetchStoreData, createStore, updateStore, updateUser, removeStoreMember,
      addProduct, addCustomer, updateProduct, updateProductStock, removeProduct,
      findProductByBarcode, addSale, setCashRegisters, deleteAccount, logout 
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
