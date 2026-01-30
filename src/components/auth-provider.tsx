'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';
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
  removeStoreMember: (userId: string) => Promise<{ error: AuthError | Error | null }>;
  addProduct: (product: Omit<Product, 'id' | 'store_id' | 'created_at'>) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'store_id' | 'created_at'>) => Promise<void>;
  updateProduct: (productId: string, product: Partial<Omit<Product, 'id' | 'store_id'>>) => Promise<void>;
  updateProductStock: (productId: string, newStock: number) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  findProductByBarcode: (barcode: string) => Promise<Product | null>;
  setCashRegisters: (action: React.SetStateAction<CashRegister[]>) => Promise<void>;
  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<Sale | null>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error: AuthError | Error | null }>;
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

  const fetchAccessStatus = useCallback(async (storeId: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_store_access_status', { p_store_id: storeId });
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) {
        setAccessStatus(data[0] as StoreAccessStatus);
      } else {
        setAccessStatus({ acesso_liberado: false, data_fim_acesso: null, plano_nome: 'Nenhum', plano_tipo: null, mensagem: 'Sem plano ativo' });
      }
    } catch (err) {
      setAccessStatus({ acesso_liberado: false, data_fim_acesso: null, plano_nome: 'Erro', plano_tipo: null, mensagem: 'Erro ao verificar acesso' });
    }
  }, []);

  const fetchStoreData = useCallback(async (userId: string) => {
    setStoreStatus('loading');
    try {
      let storeId: string | null = null;
      const { data: ownerStore } = await supabase.from('stores').select('id').eq('user_id', userId).maybeSingle();
      
      if (ownerStore) {
        storeId = (ownerStore as any).id;
      } else {
        const { data: memberEntry } = await supabase.from('store_members').select('store_id').eq('user_id', userId).maybeSingle();
        if (memberEntry) storeId = (memberEntry as any).store_id;
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
        
        if (membersRes.data && membersRes.data.length > 0) {
          const userIds = membersRes.data.map(m => m.user_id);
          const { data: profiles } = await supabase.from('users').select('*').in('id', userIds);
          const profilesMap = new Map((profiles as any[] ?? []).map(p => [p.id, p]));
          
          members = membersRes.data.map(m => ({
            ...m,
            name: profilesMap.get(m.user_id)?.name ?? null,
            email: profilesMap.get(m.user_id)?.email ?? null,
            avatar_url: profilesMap.get(m.user_id)?.avatar_url ?? null,
          })) as StoreMember[];
        }
        setStore({ ...storeData, members });
      }

      setProducts((productsRes.data as Product[]) ?? []);
      setSales((salesRes.data as Sale[]) ?? []);
      setCashRegistersState((cashRes.data as CashRegister[]) ?? []);
      setStoreStatus('has');
    } catch (err: any) {
      console.error('[AUTH] Erro ao carregar dados:', err);
      setStoreStatus('error');
      setStoreError(err.message);
    }
  }, [fetchAccessStatus]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          fetchStoreData(session.user.id);
        }
      } catch (error) {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        const newUser = session?.user ?? null;
        setUser(newUser);
        
        if (newUser) {
          fetchStoreData(newUser.id);
        } else {
          setStore(null);
          setStoreStatus('unknown');
          setProducts([]);
          setSales([]);
          setCashRegistersState([]);
          setAccessStatus(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStoreData]);

  const logout = async () => {
    await supabase.auth.signOut();
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
    if (store && user) {
      await (supabase as any).from('stores').update(data).eq('id', store.id);
      await fetchStoreData(user.id);
    }
  };

  const updateUser = async (data: any) => {
    if (user) await (supabase as any).from('users').update(data).eq('id', user.id);
  };

  const removeStoreMember = async (userId: string) => {
    if (!store || !user) return { error: new Error('Sessão inválida') };
    const { error } = await (supabase as any).from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
    if (!error) await fetchStoreData(user.id);
    return { error };
  };

  const addProduct = async (product: any) => {
    if (!store || !user) return;
    await (supabase as any).from('products').insert({ ...product, store_id: store.id });
    await fetchStoreData(user.id);
  };

  const addCustomer = async (customer: any) => {
    if (!store || !user) return;
    await (supabase as any).from('customers').insert({ ...customer, store_id: store.id });
    await fetchStoreData(user.id);
  };

  const updateProduct = async (id: string, product: any) => {
    if (!store || !user) return;
    await (supabase as any).from('products').update(product).eq('id', id);
    await fetchStoreData(user.id);
  };

  const updateProductStock = async (id: string, qty: number) => {
    if (!store || !user) return;
    await (supabase as any).from('products').update({ stock_qty: qty }).eq('id', id);
    await fetchStoreData(user.id);
  };

  const removeProduct = async (id: string) => {
    if (!store || !user) return;
    await (supabase as any).from('products').delete().eq('id', id);
    await fetchStoreData(user.id);
  };

  const findProductByBarcode = async (barcode: string) => {
    if (!store) return null;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id).eq('barcode', barcode).maybeSingle();
    return data as Product | null;
  };

  const setCashRegisters = async (action: any) => {
    if (!store || !user) return;
    const next = typeof action === 'function' ? action(cashRegisters) : action;
    const items = Array.isArray(next) ? next : [next];
    for (const cr of items) {
      if (cashRegisters.find(c => c.id === cr.id)) {
        await (supabase as any).from('cash_registers').update(cr).eq('id', cr.id);
      } else {
        await (supabase as any).from('cash_registers').insert({ ...cr, store_id: store.id });
      }
    }
    await fetchStoreData(user.id);
  };

  const addSale = async (cart: CartItem[], paymentMethod: any) => {
    if (!store || !user) return null;
    const total = cart.reduce((s, i) => s + i.subtotal_cents, 0);
    
    const { data: sale } = await (supabase as any).from('sales').insert({ 
      store_id: store.id, 
      total_cents: total, 
      payment_method: paymentMethod 
    }).select().single();

    if (sale) {
      const typedSale = sale as Sale;
      for (const item of cart) {
        await (supabase as any).from('sale_items').insert({
          sale_id: typedSale.id,
          product_id: item.product_id,
          product_name_snapshot: item.product_name_snapshot,
          product_barcode_snapshot: item.product_barcode_snapshot,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          subtotal_cents: item.subtotal_cents,
        });
        await (supabase.rpc as any)('decrement_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
      }
      await fetchStoreData(user.id);
      return typedSale;
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
