'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import type { User, Store, Product, Sale, CashRegister, StoreMember } from '@/lib/types';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  store: Store | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  createStore: (storeData: any) => Promise<Store | null>;
  updateStore: (storeData: Partial<Omit<Store, 'id' | 'user_id'>>) => Promise<void>;
  updateUser: (userData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  removeStoreMember: (userId: string) => Promise<{ error: AuthError | Error | null }>;
  // Data
  products: Product[];
  sales: Sale[];
  cashRegisters: CashRegister[];
  // Updaters
  setProducts: (action: React.SetStateAction<Product[]>) => Promise<void>;
  setSales: (action: React.SetStateAction<Sale[]>) => Promise<void>;
  setCashRegisters: (action: React.SetStateAction<CashRegister[]>) => Promise<void>;
  addSale: (sale: Omit<Sale, 'id' | 'store_id'>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchStoreData = useCallback(async (userId: string) => {
    // Try to find a store where the user is the owner
    let { data: storeDataResult, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If not an owner, check if they are a member of another store
    if (!storeDataResult && storeError?.code !== 'PGRST116') {
      console.error('Error fetching owned store:', storeError);
    }
    
    if (!storeDataResult) {
        const { data: memberData, error: memberError } = await supabase
            .from('store_members')
            .select('store_id')
            .eq('user_id', userId)
            .single();
        
        if (memberError && memberError.code !== 'PGRST116') {
          console.error('Error fetching member store:', memberError);
        }

        if(memberData) {
            const { data: memberStoreData, error: memberStoreDataError } = await supabase
                .from('stores')
                .select('*')
                .eq('id', memberData.store_id)
                .single();
            
            if (memberStoreDataError) {
              console.error('Error fetching store by member id:', memberStoreDataError);
            }
            storeDataResult = memberStoreData;
        }
    }
    
    if (storeDataResult) {
      const { data: membersData, error: membersError } = await supabase
        .rpc('get_store_members', { p_store_id: storeDataResult.id });

      if (membersError) {
        console.error('Error fetching store members:', membersError);
      }

      const storeWithMembers = { ...storeDataResult, members: membersData || [] };
      setStore(storeWithMembers as Store);

      const [productsRes, salesRes, cashRes] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeDataResult.id),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeDataResult.id),
        supabase.from('cash_registers').select('*').eq('store_id', storeDataResult.id).order('opened_at', { ascending: false }),
      ]);

      setProducts(productsRes.data || []);
      setSales(salesRes.data || []);
      setCashRegisters(cashRes.data || []);
    } else {
      setStore(null);
      setProducts([]);
      setSales([]);
      setCashRegisters([]);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setLoading(true);
        const supabaseUser = session?.user;

        if (supabaseUser) {
          let { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();
          
          if (!profile) {
              const { error: insertError } = await supabase
                  .from('users')
                  .insert({ id: supabaseUser.id, email: supabaseUser.email });
              
              if (insertError) {
                  console.error("Error creating user profile:", insertError);
                  await supabase.auth.signOut();
                  profile = null;
              } else {
                  profile = {
                      id: supabaseUser.id,
                      email: supabaseUser.email!,
                      name: undefined,
                      avatar_url: undefined,
                  };
              }
          }
          
          setUser(profile);
          if (profile) {
              await fetchStoreData(supabaseUser.id);
          }

        } else {
          setUser(null);
          setStore(null);
          setProducts([]);
          setSales([]);
          setCashRegisters([]);
        }
      } catch (e) {
        console.error("Error in onAuthStateChange", e);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchStoreData]);

  const login = useCallback(async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        if (error.message.includes('User already registered')) {
            return { error: { ...error, message: 'E-mail já cadastrado.'} };
        }
        return { error };
    }
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    router.push('/login');
  }, [router]);

  const createStore = useCallback(async (storeData: any): Promise<Store | null> => {
    if (!user) return null;

    const rpcParams = {
        p_name: storeData.name,
        p_legal_name: storeData.legal_name,
        p_cnpj: storeData.cnpj,
        p_address: storeData.address,
        p_phone: storeData.phone,
        p_timezone: storeData.timezone
    };
    
    const { data: newStoreData, error } = await supabase
      .rpc('create_new_store', rpcParams)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating store:', error);
      return null;
    }
    
    setStore(newStoreData as Store);
    
    return newStoreData as Store;
  }, [user]);

  const updateStore = useCallback(async (storeData: Partial<Omit<Store, 'id' | 'user_id' | 'members'>>) => {
    if (!store || !user) return;
    const { error } = await supabase
      .from('stores')
      .update(storeData)
      .eq('id', store.id);
      
    if (!error) {
        await fetchStoreData(user.id);
    }
  }, [store, user, fetchStoreData]);

  const updateUser = useCallback(async (userData: Partial<Omit<User, 'id' | 'email'>>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', user.id)
      .select()
      .single();
      
    if (data) setUser(data);
  }, [user]);

  const removeStoreMember = useCallback(async (userId: string) => {
    if (!store || !user) return { error: new Error('Usuário ou loja não disponíveis')};
    
    if (userId === store.user_id) {
        return { error: new Error('O proprietário da loja não pode ser removido.') };
    }

    const { error } = await supabase
        .from('store_members')
        .delete()
        .eq('user_id', userId)
        .eq('store_id', store.id);

    if (!error) {
        await fetchStoreData(user.id); // Refetch data to update the UI
    }
    return { error };
  }, [store, user, fetchStoreData]);

  const addSale = useCallback(async (newSale: Omit<Sale, 'id' | 'store_id'>) => {
    if (!store) return;
    
    const { items, ...saleData } = newSale;
    
    // Create sale
    const { data: saleResult, error: saleError } = await supabase
        .from('sales')
        .insert([{ ...saleData, store_id: store.id }])
        .select()
        .single();
        
    if (saleError || !saleResult) {
        console.error("Error creating sale", saleError);
        return;
    }
    
    // Create sale items
    const saleItemsData = items.map(item => ({...item, sale_id: saleResult.id, productId: item.productId }));
     const { data: itemsResult, error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsData)
        .select();

    if(itemsError) {
        console.error("Error creating sale items", itemsError);
        // TODO: Handle potential rollback
        return;
    }

    // Update stock
    const stockUpdates = items.map(item => 
        supabase.rpc('decrement_stock', {
            p_product_id: item.productId,
            p_quantity: item.quantity
        })
    );
    await Promise.all(stockUpdates);
    
    // Refetch data
    await fetchStoreData(store.user_id);

  }, [store, fetchStoreData]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    store,
    loading,
    login,
    signup,
    logout,
    createStore,
    updateStore,
    updateUser,
    removeStoreMember,
    products,
    sales,
    cashRegisters,
    setProducts: async (action) => {
        const newProducts = typeof action === 'function' ? action(products) : action;
        if (!store) return;

        for (const p of newProducts) {
             if (products.some(op => op.id === p.id)) { // It's an update
                const { id, ...updateData } = p;
                // Supabase needs store_id for RLS, but it's not always in the updateData
                const finalUpdateData = { ...updateData, store_id: store.id };
                await supabase.from('products').update(finalUpdateData).eq('id', id);
             } else { // It's an insert
                await supabase.from('products').insert({ ...p, store_id: store.id });
             }
        }
        await fetchStoreData(user!.id);
    },
    setSales: async (action) => {
        console.log("setSales is not implemented for Supabase backend.");
    },
    setCashRegisters: async (action) => {
        const newCashRegisters = typeof action === 'function' ? action(cashRegisters) : action;
        const oldRegisterIds = new Set(cashRegisters.map(cr => cr.id));
        
        for (const cr of newCashRegisters) {
            if(oldRegisterIds.has(cr.id)) {
                // It's an update
                const { id, ...updateData } = cr;
                await supabase.from('cash_registers').update(updateData).eq('id', id);
            } else {
                // It's an insert
                 await supabase.from('cash_registers').insert(cr);
            }
        }
        await fetchStoreData(user!.id);
    },
    addSale,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
