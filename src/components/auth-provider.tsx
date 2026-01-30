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
  StoreMember
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
  fetchStoreData: (userId: string) => Promise<void>;
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
        return;
      }

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
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStoreData]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    setStoreStatus('unknown');
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, store, storeStatus, accessStatus, products, sales, cashRegisters,
      fetchStoreData, logout 
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
