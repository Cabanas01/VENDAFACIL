
'use client';

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
  StoreMember,
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
  cashRegisters: CashRegister[];
  
  // Funções de Negócio (PASSIVAS - NÃO NAVEGAM)
  fetchStoreData: (userId: string) => Promise<void>;
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
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchStoreData = useCallback(async (userId: string) => {
    setStoreStatus('loading');
    try {
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      let storeId = ownerStore?.id;

      if (!storeId) {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        storeId = memberEntry?.store_id;
      }

      if (!storeId) {
        setStoreStatus('none');
        setStore(null);
        return;
      }

      // Buscar status de acesso via RPC
      const { data: statusData } = await (supabase.rpc as any)('get_store_access_status', { p_store_id: storeId });
      setAccessStatus(statusData?.[0] || null);

      const [storeRes, productsRes, salesRes, cashRes, membersRes] = await Promise.all([
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('store_members').select('*').eq('store_id', storeId),
      ]);

      if (storeRes.data) {
        const { data: profiles } = await supabase.from('users').select('*').in('id', (membersRes.data || []).map(m => m.user_id));
        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
        const members = (membersRes.data || []).map(m => ({
          ...m,
          name: profilesMap.get(m.user_id)?.name ?? null,
          email: profilesMap.get(m.user_id)?.email ?? null,
          avatar_url: profilesMap.get(m.user_id)?.avatar_url ?? null,
        })) as StoreMember[];
        setStore({ ...storeRes.data, members } as Store);
      }

      setProducts(productsRes.data as Product[] || []);
      setSales(salesRes.data as Sale[] || []);
      setCashRegistersState(cashRes.data as CashRegister[] || []);
      setStoreStatus('has');
    } catch (err) {
      console.error('[AUTH] Erro ao carregar dados da loja:', err);
      setStoreStatus('error');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);
      if (sessionUser) fetchStoreData(sessionUser.id);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) fetchStoreData(newUser.id);
      else {
        setStore(null);
        setStoreStatus('none');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStoreData]);

  // IMPLEMENTAÇÃO DAS FUNÇÕES DE NEGÓCIO (PASSIVAS)

  const createStore = useCallback(async (storeData: any) => {
    if (!user) return null;
    const { data, error } = await (supabase.rpc as any)('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone,
    });

    if (error) throw error;
    await fetchStoreData(user.id);
    return data as Store;
  }, [user, fetchStoreData]);

  const updateStore = useCallback(async (data: any) => {
    if (!store || !user) return;
    const { error } = await supabase.from('stores').update(data).eq('id', store.id);
    if (error) throw error;
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateUser = useCallback(async (data: any) => {
    if (!user) return;
    const { error } = await supabase.from('users').update(data).eq('id', user.id);
    if (error) throw error;
    // Update local user state
    const { data: updated } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (updated) setUser(updated as any);
  }, [user]);

  const removeStoreMember = useCallback(async (userId: string) => {
    if (!store || !user) return { error: new Error('Sessão inválida') };
    const { error } = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
    if (!error) await fetchStoreData(user.id);
    return { error };
  }, [store, user, fetchStoreData]);

  const addProduct = useCallback(async (product: any) => {
    if (!store || !user) return;
    const { error } = await (supabase as any).from('products').insert({ ...product, store_id: store.id });
    if (error) throw error;
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const addCustomer = useCallback(async (customer: any) => {
    if (!store || !user) return;
    const { error } = await (supabase as any).from('customers').insert({ ...customer, store_id: store.id });
    if (error) throw error;
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateProduct = useCallback(async (id: string, product: any) => {
    if (!store || !user) return;
    const { error } = await (supabase as any).from('products').update(product).eq('id', id).eq('store_id', store.id);
    if (error) throw error;
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateProductStock = useCallback(async (id: string, qty: number) => {
    if (!store || !user) return;
    const { error } = await (supabase as any).from('products').update({ stock_qty: qty }).eq('id', id).eq('store_id', store.id);
    if (error) throw error;
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const removeProduct = useCallback(async (id: string) => {
    if (!store || !user) return;
    const { error } = await supabase.from('products').delete().eq('id', id).eq('store_id', store.id);
    if (error) throw error;
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const findProductByBarcode = useCallback(async (barcode: string) => {
    if (!store) return null;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('barcode', barcode).maybeSingle();
    return data as Product || null;
  }, [store]);

  const addSale = useCallback(async (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => {
    if (!store || !user) return null;
    const total = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);
    
    // 1. Criar Venda
    const { data: sale, error: saleError } = await (supabase as any).from('sales').insert({
      store_id: store.id,
      total_cents: total,
      payment_method: paymentMethod
    }).select().single();

    if (saleError) throw saleError;

    // 2. Criar Itens e Baixar Estoque
    for (const item of cart) {
      await (supabase as any).from('sale_items').insert({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        product_barcode_snapshot: item.product_barcode_snapshot,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        subtotal_cents: item.subtotal_cents
      });

      await (supabase.rpc as any)('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });
    }

    await fetchStoreData(user.id);
    return sale as Sale;
  }, [store, user, fetchStoreData]);

  const setCashRegisters = useCallback(async (action: any) => {
    if (!store || !user) return;
    const next = typeof action === 'function' ? action(cashRegisters) : action;
    // Simples persistência para o exemplo, idealmente seria um por um ou batch
    for (const cr of next) {
      if (cashRegisters.find(c => c.id === cr.id)) {
        await (supabase as any).from('cash_registers').update(cr).eq('id', cr.id);
      } else {
        await (supabase as any).from('cash_registers').insert({ ...cr, store_id: store.id });
      }
    }
    await fetchStoreData(user.id);
  }, [store, user, cashRegisters, fetchStoreData]);

  const deleteAccount = useCallback(async () => {
    const { error } = await (supabase.rpc as any)('delete_user_account');
    return { error };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    setStoreStatus('none');
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, store, storeStatus, accessStatus, products, sales, cashRegisters,
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
