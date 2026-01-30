'use client';

/**
 * @fileOverview AuthProvider (Cérebro Passivo)
 * 
 * Este componente gerencia estritamente o estado e a sincronização com o Supabase.
 * Ele NÃO executa redirecionamentos (REGRA DE OURO). 
 * Reporta a verdade do banco através da máquina de estados 'storeStatus'.
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
  StoreMember,
  Customer
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
  const [loading, setLoading] = useState(true); // Controla a espera da sessão inicial
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('loading_auth');
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  /**
   * Sincroniza dados da loja de forma protegida.
   * Não confia em resultados nulos se houver erro técnico.
   */
  const fetchStoreData = useCallback(async (userId: string) => {
    setStoreStatus('loading_store');
    
    try {
      // 1. Tentar localizar como Proprietário
      const { data: ownerStore, error: ownerError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerError) {
        console.error('[AUTH] Falha técnica (RLS/Rede) ao buscar owner:', ownerError);
        setStoreStatus('error');
        return;
      }

      let storeId = ownerStore?.id;

      // 2. Se não for dono, tentar localizar como Membro da Equipe
      if (!storeId) {
        const { data: memberEntry, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (memberError) {
          console.error('[AUTH] Falha técnica (RLS/Rede) ao buscar membership:', memberError);
          setStoreStatus('error');
          return;
        }
        storeId = memberEntry?.store_id;
      }

      // 3. Se conclusivamente não existir vínculo
      if (!storeId) {
        setStoreStatus('no_store');
        setStore(null);
        return;
      }

      // 4. Se existir, carregar todo o contexto operacional
      const [statusRes, storeRes, productsRes, salesRes, cashRes, membersRes, customersRes] = await Promise.all([
        supabase.rpc('get_store_access_status', { p_store_id: storeId }),
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('store_members').select('*').eq('store_id', storeId),
        supabase.from('customers').select('*').eq('store_id', storeId).order('name'),
      ]);

      if (storeRes.error) throw storeRes.error;

      // Hidratar membros com perfis de usuários
      let members: StoreMember[] = [];
      if (membersRes.data && membersRes.data.length > 0) {
        const memberUserIds = membersRes.data.map(m => m.user_id);
        const { data: profiles } = await supabase.from('users').select('*').in('id', memberUserIds);
        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
        members = membersRes.data.map(m => ({
          ...m,
          name: profilesMap.get(m.user_id)?.name ?? null,
          email: profilesMap.get(m.user_id)?.email ?? null,
          avatar_url: profilesMap.get(m.user_id)?.avatar_url ?? null,
        })) as StoreMember[];
      }

      setAccessStatus(statusRes.data?.[0] || null);
      setStore({ ...storeRes.data, members } as Store);
      setProducts(productsRes.data as Product[] || []);
      setSales(salesRes.data as Sale[] || []);
      setCustomers(customersRes.data as Customer[] || []);
      setCashRegistersState(cashRes.data as CashRegister[] || []);
      
      // Estado Final Sucesso
      setStoreStatus('has_store');

    } catch (err) {
      console.error('[AUTH] Falha crítica ao hidratar loja:', err);
      setStoreStatus('error');
    }
  }, []);

  /**
   * Monitoramento de Sessão (Supabase Auth)
   */
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setStoreStatus('loading_auth');
      const { data } = await supabase.auth.getSession();
      
      if (!mounted) return;

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setLoading(false); // Libera o bloqueio inicial de carregamento de página

      if (sessionUser) {
        fetchStoreData(sessionUser.id);
      } else {
        setStoreStatus('no_store'); 
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      
      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && newUser)) {
        setUser(newUser);
        fetchStoreData(newUser!.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setStore(null);
        setStoreStatus('no_store');
        setAccessStatus(null);
        setProducts([]);
        setSales([]);
        setCustomers([]);
        setCashRegistersState([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStoreData]);

  /**
   * Operações de Mutação (Passivas)
   */
  const createStore = useCallback(async (storeData: any) => {
    if (!user) return null;
    
    const { data, error } = await supabase.rpc('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone,
    });

    if (error) {
      console.error('[AUTH] Erro ao criar loja:', error);
      throw error;
    }

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
  }, [user]);

  const removeStoreMember = useCallback(async (userId: string) => {
    if (!store || !user) return { error: new Error('Sessão inválida') };
    const { error } = await supabase.from('store_members').delete().eq('user_id', userId).eq('store_id', store.id);
    if (!error) await fetchStoreData(user.id);
    return { error };
  }, [store, user, fetchStoreData]);

  const addProduct = useCallback(async (product: any) => {
    if (!store || !user) return;
    const { error } = await supabase.from('products').insert({ ...product, store_id: store.id });
    if (error) throw error;
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const addCustomer = useCallback(async (customer: any) => {
    if (!store || !user) return;
    const { error } = await supabase.from('customers').insert({ ...customer, store_id: store.id });
    
    if (error) {
      if (error.message?.includes('trial_customer_limit')) {
        throw new Error('Limite de clientes do plano atingido. Faça o upgrade para continuar.');
      }
      throw error;
    }
    
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateProduct = useCallback(async (id: string, product: any) => {
    if (!store || !user) return;
    const { error } = await supabase.from('products').update(product).eq('id', id).eq('store_id', store.id);
    if (error) throw error;
    await fetchStoreData(user.id);
  }, [store, user, fetchStoreData]);

  const updateProductStock = useCallback(async (id: string, qty: number) => {
    if (!store || !user) return;
    const { error } = await supabase.from('products').update({ stock_qty: qty }).eq('id', id).eq('store_id', store.id);
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

    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          store_id: store.id,
          total_cents: total,
          payment_method: paymentMethod
        })
        .select()
        .single();

      if (saleError) {
        if (saleError.message?.includes('trial_sales_limit')) {
          throw new Error('Limite de vendas do plano atingido. Faça o upgrade para continuar.');
        }
        throw saleError;
      }

      for (const item of cart) {
        const { error: itemError } = await supabase.from('sale_items').insert({
          sale_id: sale.id,
          product_id: item.product_id,
          product_name_snapshot: item.product_name_snapshot,
          product_barcode_snapshot: item.product_barcode_snapshot,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          subtotal_cents: item.subtotal_cents
        });

        if (itemError) throw itemError;

        const { error: stockError } = await supabase.rpc('decrement_stock', { 
          p_product_id: item.product_id, 
          p_quantity: item.quantity 
        });
        
        if (stockError) throw stockError;
      }

      await fetchStoreData(user.id);
      return sale as Sale;

    } catch (err: any) {
      console.error('[SALE_ERROR]', err);
      throw err; 
    }
  }, [store, user, fetchStoreData]);

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
    await fetchStoreData(user.id);
  }, [store, user, cashRegisters, fetchStoreData]);

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_user_account');
    return { error };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStore(null);
    setStoreStatus('no_store');
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
