'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import type {
  Store,
  Product,
  Sale,
  CashRegister,
  CartItem,
  StoreStatus,
  StoreAccessStatus,
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchStoreData = useCallback(async (userId: string) => {
    setStoreStatus('loading');
    try {
      // 1. Verificar se é dono ou membro
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

      // 2. Buscar status de acesso (Billing)
      const { data: access } = await supabase.rpc('get_store_access_status', { p_store_id: storeId });
      if (access?.[0]) setAccessStatus(access[0]);

      // 3. Buscar detalhes da loja e dados operacionais
      const { data: storeDetails } = await supabase.from('stores').select('*').eq('id', storeId).single();
      const [productsRes, salesRes, cashRes] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
      ]);

      setStore(storeDetails as Store);
      setProducts(productsRes.data ?? []);
      setSales(salesRes.data ?? []);
      setCashRegistersState(cashRes.data ?? []);
      setStoreStatus('has');
    } catch (err) {
      console.error('[AUTH_PROVIDER] Error fetching store data:', err);
      setStoreStatus('error');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchStoreData(initialSession.user.id);
        }
      } catch (error) {
        console.error('[AUTH_PROVIDER] Init error:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        await fetchStoreData(newSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        setStore(null);
        setStoreStatus('unknown');
        setAccessStatus(null);
      }
      
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStoreData]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
  }, []);

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    store,
    storeStatus,
    accessStatus,
    products,
    sales,
    cashRegisters,
    fetchStoreData,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
