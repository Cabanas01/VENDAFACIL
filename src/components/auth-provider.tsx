'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { 
  Store, 
  Product, 
  Sale, 
  CashRegister, 
  StoreStatus, 
  StoreAccessStatus,
  Customer,
  CartItem,
  SaleItem,
  StoreMember
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  store: Store | null;
  storeStatus: StoreStatus;
  storeError: string | null;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];
  fetchStoreData: (userId: string) => Promise<void>;
  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => Promise<void>;
  updateUser: (userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: any }>;
  addProduct: (product: any) => Promise<void>;
  addCustomer: (customer: any) => Promise<void>;
  updateProduct: (id: string, product: any) => Promise<void>;
  updateProductStock: (id: string, qty: number) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  findProductByBarcode: (barcode: string) => Promise<Product | null>;
  setCashRegisters: (action: any) => Promise<void>;
  addSale: (cart: CartItem[], paymentMethod: any) => Promise<Sale | null>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [storeError, setStoreError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchAccessStatus = async (storeId: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_store_access_status', { p_store_id: storeId });
      if (error) throw error;
      setAccessStatus(data?.[0] || { acesso_liberado: false, data_fim_acesso: null, plano_nome: 'Nenhum', plano_tipo: null, mensagem: 'Sem plano ativo' });
    } catch (err) {
      setAccessStatus({ acesso_liberado: false, data_fim_acesso: null, plano_nome: 'Erro', plano_tipo: null, mensagem: 'Erro ao verificar acesso' });
    }
  };

  const fetchStoreData = async (userId: string) => {
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

      await fetchAccessStatus(storeId);
      
      const [storeRes, productsRes, salesRes, cashRes, membersRes] = await Promise.all([
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('store_members').select('*').eq('store_id', storeId),
      ]);

      if (storeRes.data) {
        const storeData = storeRes.data as Store;
        let members: StoreMember[] = [];
        if (membersRes.data?.length) {
          const { data: profiles } = await supabase.from('users').select('*').in('id', membersRes.data.map(m => m.user_id));
          const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
          members = membersRes.data.map(m => ({
            ...m,
            name: profilesMap.get(m.user_id)?.name ?? null,
            email: profilesMap.get(m.user_id)?.email ?? null,
            avatar_url: profilesMap.get(m.user_id)?.avatar_url ?? null,
          })) as StoreMember[];
        }
        setStore({ ...storeData, members });
      }

      setProducts((productsRes.data as any[]) || []);
      setSales((salesRes.data as any[]) || []);
      setCashRegistersState((cashRes.data as any[]) || []);
      setStoreStatus('has');
    } catch (err: any) {
      setStoreStatus('error');
      setStoreError(err.message);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        setLoading(false);
        if (sessionUser) fetchStoreData(sessionUser.id);
      } catch (error) {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) fetchStoreData(newUser.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    setStoreStatus('unknown');
  };

  const deleteAccount = async () => {
    const { error } = await supabase.rpc('delete_user_account');
    if (!error) await logout();
    return { error };
  };

  const createStore = async (data: any) => {
    const { data: newStore } = await (supabase.rpc as any)('create_new_store', data).select().single();
    if (newStore && user) await fetchStoreData(user.id);
    return newStore as Store;
  };

  const updateStore = async (data: any) => {
    if (store) {
      await (supabase as any).from('stores').update(data).eq('id', store.id);
      if (user) await fetchStoreData(user.id);
    }
  };

  const updateUser = async (data: any) => {
    if (user) await (supabase as any).from('users').update(data).eq('id', user.id);
  };

  const removeStoreMember = async (userId: string) => {
    const { error } = await (supabase as any).from('store_members').delete().eq('user_id', userId).eq('store_id', store?.id);
    if (!error && user) await fetchStoreData(user.id);
    return { error };
  };

  const addProduct = async (product: any) => {
    await (supabase as any).from('products').insert({ ...product, store_id: store?.id });
    if (user) await fetchStoreData(user.id);
  };

  const addCustomer = async (customer: any) => {
    await (supabase as any).from('customers').insert({ ...customer, store_id: store?.id });
    if (user) await fetchStoreData(user.id);
  };

  const updateProduct = async (id: string, product: any) => {
    await (supabase as any).from('products').update(product).eq('id', id);
    if (user) await fetchStoreData(user.id);
  };

  const updateProductStock = async (id: string, qty: number) => {
    await (supabase as any).from('products').update({ stock_qty: qty }).eq('id', id);
    if (user) await fetchStoreData(user.id);
  };

  const removeProduct = async (id: string) => {
    await (supabase as any).from('products').delete().eq('id', id);
    if (user) await fetchStoreData(user.id);
  };

  const findProductByBarcode = async (barcode: string) => {
    const { data } = await supabase.from('products').select('*').eq('store_id', store?.id).eq('barcode', barcode).maybeSingle();
    return data as Product | null;
  };

  const setCashRegisters = async (action: any) => {
    const next = typeof action === 'function' ? action(cashRegisters) : action;
    const items = Array.isArray(next) ? next : [next];
    for (const cr of items) {
      if (cashRegisters.find(c => c.id === cr.id)) {
        await (supabase as any).from('cash_registers').update(cr).eq('id', cr.id);
      } else {
        await (supabase as any).from('cash_registers').insert({ ...cr, store_id: store?.id });
      }
    }
    if (user) await fetchStoreData(user.id);
  };

  const addSale = async (cart: CartItem[], paymentMethod: any) => {
    const total = cart.reduce((s, i) => s + i.subtotal_cents, 0);
    const { data: sale } = await (supabase as any).from('sales').insert({ store_id: store?.id, total_cents: total, payment_method: paymentMethod }).select().single();
    if (sale) {
      for (const item of cart) {
        await (supabase as any).from('sale_items').insert({
          sale_id: sale.id,
          product_id: item.product_id,
          product_name_snapshot: item.product_name_snapshot,
          product_barcode_snapshot: item.product_barcode_snapshot,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          subtotal_cents: item.subtotal_cents,
        });
        await (supabase.rpc as any)('decrement_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
      }
      if (user) await fetchStoreData(user.id);
      return sale as Sale;
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, store, storeStatus, storeError, accessStatus, products, sales, cashRegisters,
      fetchStoreData, createStore, updateStore, updateUser, removeStoreMember, addProduct, addCustomer,
      updateProduct, updateProductStock, removeProduct, findProductByBarcode, setCashRegisters, addSale,
      logout, deleteAccount
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