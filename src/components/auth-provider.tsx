'use client';

import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import type { User, Store, Product, Sale, CashRegister, CartItem, StoreStatus, StoreMember } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  store: Store | null;
  loading: boolean;
  storeStatus: StoreStatus;
  storeError: string | null;

  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ error: AuthError | null }>;

  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => Promise<void>;
  updateUser: (userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: AuthError | Error | null }>;

  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];

  addProduct: (product: Omit<Product, 'id' | 'store_id' | 'created_at'>) => Promise<void>;
  updateProduct: (productId: string, product: Partial<Omit<Product, 'id' | 'store_id'>>) => Promise<void>;
  updateProductStock: (productId: string, newStock: number) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  
  setCashRegisters: (action: React.SetStateAction<CashRegister[]>) => Promise<void>;

  addSale: (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [storeError, setStoreError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProductsState] = useState<Product[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  const fetchStoreData = useCallback(async (userId: string) => {
    if (!supabase) {
      setStoreStatus('error');
      setStoreError('Supabase client not available.');
      return;
    }
    setStoreStatus('loading');
    setStoreError(null);

    try {
      // Step 1: Find the user's store, either as owner or member.
      let storeId: string | null = null;
      
      const { data: ownerStore, error: ownerError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerError) throw ownerError;

      if (ownerStore) {
        storeId = ownerStore.id;
      } else {
        const { data: memberEntry, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (memberError) throw memberError;

        if (memberEntry) {
          storeId = memberEntry.store_id;
        }
      }

      // Step 2: If no store is found, set status to 'none' and finish.
      if (!storeId) {
        setStore(null);
        setStoreStatus('none');
        setProductsState([]);
        setSalesState([]);
        setCashRegistersState([]);
        return;
      }
      
      // Step 3: Fetch all related data in parallel using the found store ID.
      const [
        storeDetailsResult,
        membersResult,
        productsResult,
        salesResult,
        cashRegistersResult
      ] = await Promise.all([
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('store_members').select('*, user:users(name, email, avatar_url)').eq('store_id', storeId),
        supabase.from('products').select('*').eq('store_id', storeId).order('name', { ascending: true }),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false })
      ]);
      
      const { data: storeDetails, error: storeError } = storeDetailsResult;
      const { data: members, error: membersError } = membersResult;
      const { data: products, error: productsError } = productsResult;
      const { data: sales, error: salesError } = salesResult;
      const { data: cashRegisters, error: cashRegistersError } = cashRegistersResult;

      // Step 4: Handle any errors from the parallel fetches.
      if (storeError || membersError || productsError || salesError || cashRegistersError) {
        throw storeError || membersError || productsError || salesError || cashRegistersError;
      }

      // Step 5: Format the fetched data and update the application state.
      const formattedMembers: StoreMember[] = (members || []).map((m: any) => ({
        user_id: m.user_id,
        store_id: m.store_id,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
        avatar_url: m.user.avatar_url,
      }));

      setStore({ ...storeDetails, members: formattedMembers });
      setProductsState(products || []);
      setSalesState(sales || []);
      setCashRegistersState(cashRegisters || []);
      setStoreStatus('has');

    } catch (err: any) {
        console.error('[STORE] Fatal error fetching store data:', err);
        setStore(null);
        setStoreStatus('error');
        setStoreError(err.message || 'An unknown error occurred.');
    }
  }, [supabase]);

  const handleSession = useCallback(async (session: any) => {
    if (!supabase) return;
    const supabaseUser = session?.user;

    if (!supabaseUser) {
      setUser(null);
      setStore(null);
      setStoreStatus('unknown');
      setProductsState([]);
      setSalesState([]);
      setCashRegistersState([]);
      return;
    }
    
    let profile: any = null;
    try {
        const { data } = await supabase.from('users').select('*').eq('id', supabaseUser.id).single();
        profile = data;
    } catch(e) { /* ignore */ }

    setUser(profile || { id: supabaseUser.id, email: supabaseUser.email });
    await fetchStoreData(supabaseUser.id);
  }, [supabase, fetchStoreData]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setStoreStatus('error');
      setStoreError('Supabase client not configured. Check environment variables.');
      return;
    }

    let mounted = true;
    const run = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        await handleSession(session);
        setLoading(false);
      }
    };
    run();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (mounted) {
          setLoading(true);
          await handleSession(session);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, handleSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: new Error('Supabase not configured') as any };
      return supabase.auth.signInWithPassword({ email, password });
    }, [supabase]
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return { error: new Error('Supabase not configured') as any };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` : undefined,
        },
      });
      return { error };
    }, [supabase]
  );

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    setStoreStatus('unknown');
    router.push('/login');
  }, [supabase, router]);

  const deleteAccount = useCallback(async () => {
    if (!supabase) return { error: new Error('Supabase not configured') as any };
    const { error } = await supabase.rpc('delete_user_account');
    if (!error) {
      await logout();
    }
    return { error };
  }, [supabase, logout]);

  const createStore = useCallback(async (storeData: any): Promise<Store | null> => {
    if (!supabase || !user) return null;
    const { data: newStoreData, error } = await supabase.rpc('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone,
    }).select().single();

    if (error) {
      console.error('[STORE] Error creating store:', error);
      setStoreError(error.message);
      return null;
    }
    await fetchStoreData(user.id);
    return newStoreData as Store;
  }, [supabase, user, fetchStoreData]);
  
  const updateStore = useCallback(async (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => {
      if (!supabase || !store || !user) return;
      const { error } = await supabase.from('stores').update(storeData).eq('id', store.id);
      if (error) console.error('[STORE] updateStore error', error);
      else await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);

  const updateUser = useCallback(async (userData: Partial<Omit<User, 'id' | 'email'>>) => {
      if (!supabase || !user) return;
      const { data, error } = await supabase.from('users').update(userData).eq('id', user.id).select().single();
      if (error) console.error('[AUTH] updateUser error', error);
      if (data) setUser(data as User);
  }, [supabase, user]);

  const removeStoreMember = useCallback(async (userId: string) => {
      if (!supabase || !store || !user) return { error: new Error('User or store not available') };
      if (userId === store.user_id) return { error: new Error('Owner cannot be removed.') };
      const { error } = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
      if (!error) await fetchStoreData(user.id);
      return { error };
  }, [supabase, store, user, fetchStoreData]);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'store_id' | 'created_at'>) => {
      if (!supabase || !store || !user) return;
      const { error } = await supabase.from('products').insert({ ...product, store_id: store.id });
      if (error) console.error('[PRODUCT] insert error', error); else await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);
  
  const updateProduct = useCallback(async (productId: string, product: Partial<Omit<Product, 'id' | 'store_id'>>) => {
      if (!supabase || !store || !user) return;
      const { error } = await supabase.from('products').update(product).eq('id', productId).eq('store_id', store.id);
      if (error) console.error('[PRODUCT] update error', error); else await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);

  const updateProductStock = useCallback(async (productId: string, newStock: number) => {
      if (!supabase || !store || !user) return;
      const { error } = await supabase.from('products').update({ stock_qty: newStock }).eq('id', productId).eq('store_id', store.id);
      if (error) console.error('[PRODUCT] update stock error', error); else await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);

  const removeProduct = useCallback(async (productId: string) => {
      if (!supabase || !store || !user) return;
      const { error } = await supabase.from('products').delete().eq('id', productId).eq('store_id', store.id);
      if (error) console.error('[PRODUCT] delete error', error); else await fetchStoreData(user.id);
  }, [supabase, store, user, fetchStoreData]);
  
  const setCashRegisters = useCallback(async (action: React.SetStateAction<CashRegister[]>) => {
      if (!supabase || !user || !store) return;
      const currentRegisters = cashRegisters;
      const newCashRegisters = typeof action === 'function' ? action(currentRegisters) : action;
      const oldRegisterIds = new Set(currentRegisters.map((cr) => cr.id));

      for (const cr of newCashRegisters) {
          if (oldRegisterIds.has(cr.id)) {
              const { id, ...updateData } = cr;
              await supabase.from('cash_registers').update(updateData).eq('id', id);
          } else {
              await supabase.from('cash_registers').insert({ ...cr, store_id: store.id });
          }
      }
      await fetchStoreData(user.id);
  }, [supabase, user, store, cashRegisters, fetchStoreData]);

  const addSale = useCallback(async (cart: CartItem[], paymentMethod: 'cash' | 'pix' | 'card') => {
    if (!supabase || !store || !user) throw new Error('Session/store not initialized.');
    
    const saleId = `sale_${Date.now()}`;
    const createdAt = new Date().toISOString();
    const totalCents = cart.reduce((sum, item) => sum + item.subtotal_cents, 0);

    try {
      // 1. Create the main sale record
      const { error: saleError } = await supabase.from('sales').insert({
        id: saleId,
        store_id: store.id,
        created_at: createdAt,
        payment_method: paymentMethod,
        total_cents: totalCents,
      }).single();

      if (saleError) throw saleError;

      // 2. Prepare and insert sale items, one by one for robustness.
      const insertedItemIds: number[] = [];
      for (const item of cart) {
        const { data: insertedItem, error: itemError } = await supabase.from('sale_items').insert({
            sale_id: saleId,
            product_id: item.product_id,
            product_name_snapshot: item.product_name_snapshot,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            subtotal_cents: item.subtotal_cents,
        }).select('id').single();

        if (itemError) {
          console.error('[SALE] Error creating sale item, rolling back...', itemError);
          // Rollback: delete already inserted items for this sale
          if (insertedItemIds.length > 0) {
            await supabase.from('sale_items').delete().in('id', insertedItemIds);
          }
          // Rollback: delete the main sale record
          await supabase.from('sales').delete().eq('id', saleId);
          throw itemError;
        }
        if (insertedItem) {
            insertedItemIds.push(insertedItem.id);
        }
      }
      
      // 3. Decrement stock for each product
      const stockErrors = [];
      for (const item of cart) {
        const { error: stockError } = await supabase.rpc('decrement_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
        });
        if (stockError) {
            stockErrors.push(stockError);
            console.error('[SALE] Stock decrement failed for product', item.product_id, stockError);
        }
      }
      if (stockErrors.length > 0) {
          console.error('[SALE] Stock decrement failed for some items, rolling back sale...', stockErrors);
          // Rollback sale if stock decrement fails
          if (insertedItemIds.length > 0) {
            await supabase.from('sale_items').delete().in('id', insertedItemIds);
          }
          await supabase.from('sales').delete().eq('id', saleId);
          throw new Error('Failed to update stock for one or more items.');
      }

      // 4. Refresh all store data to reflect the new sale and stock levels
      await fetchStoreData(user.id);
    } catch (error) {
      console.error('[SALE] Full sale creation process failed:', error);
      throw error;
    }
  }, [supabase, store, user, fetchStoreData]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    store,
    loading,
    storeStatus,
    storeError,
    login,
    signup,
    logout,
    deleteAccount,
    createStore,
    updateStore,
    updateUser,
    removeStoreMember,
    products,
    sales,
    cashRegisters,
    addProduct,
    updateProduct,
    updateProductStock,
    removeProduct,
    setCashRegisters,
    addSale,
  };

  if (!supabase) {
    return (
      <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
        <b>Supabase configuration missing.</b>
        <div>Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and Redeploy.</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
