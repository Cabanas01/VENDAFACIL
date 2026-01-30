'use client';

/**
 * @fileOverview AuthProvider Refatorado (Sênior)
 * Objetivos:
 * 1. Passividade Total: Este componente NÃO executa navegação. Ele é apenas o armazém de estado.
 * 2. Detecção Robusta de Loja: Diferencia erro de acesso (RLS) de ausência real de dados.
 * 3. Previsibilidade: Estados claros para que o AppLayout tome decisões sem loops.
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
  Customer,
  SaleItem
} from '@/lib/types';

type AuthContextType = {
  user: User | null;
  loading: boolean; // Refere-se apenas ao carregamento da SESSÃO inicial
  store: Store | null;
  storeStatus: StoreStatus;
  accessStatus: StoreAccessStatus | null;
  products: Product[];
  sales: Sale[];
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
  const [loading, setLoading] = useState(true); // Sessão auth
  const [store, setStore] = useState<Store | null>(null);
  const [storeStatus, setStoreStatus] = useState<StoreStatus>('unknown');
  const [accessStatus, setAccessStatus] = useState<StoreAccessStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashRegisters, setCashRegistersState] = useState<CashRegister[]>([]);

  /**
   * Busca dados da loja de forma ultra-defensiva.
   * Não assume 'no_store' a menos que todos os selects retornem explicitamente vazio E sem erros.
   */
  const fetchStoreData = useCallback(async (userId: string) => {
    // 1. Iniciamos o carregamento da loja. O AppLayout deve mostrar um Loader aqui.
    setStoreStatus('loading_store');
    
    try {
      // 2. Tentar buscar como proprietário (Owner)
      // Usamos .select('id') para ser rápido.
      const { data: ownerStore, error: ownerError } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      // 🚨 CRÍTICO: Se houver erro técnico (RLS, rede), NÃO prosseguimos para 'no_store'.
      if (ownerError) {
        console.error('[AUTH] Erro ao buscar owner store:', ownerError);
        setStoreStatus('error');
        return;
      }

      let storeId = ownerStore?.id;

      // 3. Se não for dono, tentar buscar como membro da equipe (Staff)
      if (!storeId) {
        const { data: memberEntry, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (memberError) {
          console.error('[AUTH] Erro ao buscar membership:', memberError);
          setStoreStatus('error');
          return;
        }
        storeId = memberEntry?.store_id;
      }

      // 4. Se após ambas as buscas honestas não houver ID, o usuário realmente não tem loja.
      if (!storeId) {
        setStoreStatus('no_store');
        setStore(null);
        return;
      }

      // 5. Carregar detalhes da loja e acessos (Paralelo para velocidade)
      const [statusRes, storeRes, productsRes, salesRes, cashRes, membersRes] = await Promise.all([
        (supabase.rpc as any)('get_store_access_status', { p_store_id: storeId }),
        supabase.from('stores').select('*').eq('id', storeId).single(),
        supabase.from('products').select('*').eq('store_id', storeId).order('name'),
        supabase.from('sales').select('*, items:sale_items(*)').eq('store_id', storeId).order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').eq('store_id', storeId).order('opened_at', { ascending: false }),
        supabase.from('store_members').select('*').eq('store_id', storeId),
      ]);

      // Verificar se houve falha na busca principal da loja
      if (storeRes.error) throw storeRes.error;

      // 6. Processar Membros (Busca os perfis dos IDs encontrados)
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

      // 7. Commit Final do Estado
      setAccessStatus(statusRes.data?.[0] || null);
      setStore({ ...storeRes.data, members } as Store);
      setProducts(productsRes.data as Product[] || []);
      setSales(salesRes.data as Sale[] || []);
      setCashRegistersState(cashRes.data as CashRegister[] || []);
      
      // 🎉 Terminal: O usuário tem loja e está tudo carregado.
      setStoreStatus('has_store');

    } catch (err) {
      console.error('[AUTH] Falha crítica inesperada no carregamento dos dados:', err);
      setStoreStatus('error');
    }
  }, []);

  /**
   * Monitoramento Inicial da Sessão
   */
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Começamos em loading: true
      const { data } = await supabase.auth.getSession();
      
      if (!mounted) return;

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setLoading(false); // Auth resolvido. Agora o storeStatus assume o controle visual.

      if (sessionUser) {
        // Se temos usuário, iniciamos a busca da loja imediatamente.
        fetchStoreData(sessionUser.id);
      } else {
        // Sem usuário, o status de loja é irrelevante para este contexto.
        setStoreStatus('no_store'); 
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
        fetchStoreData(newUser.id);
      } else {
        // Reset total em caso de logout
        setStore(null);
        setStoreStatus('no_store');
        setAccessStatus(null);
        setProducts([]);
        setSales([]);
        setCashRegistersState([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchStoreData]);

  /**
   * Métodos de Mutação (100% Passivos)
   */
  const createStore = useCallback(async (storeData: any) => {
    if (!user) return null;
    
    // Trava de segurança: Se já estamos carregando ou já temos loja, não duplicar.
    if (storeStatus === 'loading_store' || storeStatus === 'has_store') {
        return store;
    }

    const { data, error } = await (supabase.rpc as any)('create_new_store', {
      p_name: storeData.name,
      p_legal_name: storeData.legal_name,
      p_cnpj: storeData.cnpj,
      p_address: storeData.address,
      p_phone: storeData.phone,
      p_timezone: storeData.timezone,
    });

    if (error) {
      console.error('[AUTH] Falha ao criar loja via RPC:', error);
      throw error;
    }
    
    // Atualiza o estado global sem navegar. O AppLayout detectará a mudança.
    await fetchStoreData(user.id);
    return data as Store;
  }, [user, storeStatus, store, fetchStoreData]);

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
    // O onAuthStateChange ou fetch local atualizará o objeto user.
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
    
    const { data: sale, error: saleError } = await (supabase as any).from('sales').insert({
      store_id: store.id,
      total_cents: total,
      payment_method: paymentMethod
    }).select().single();

    if (saleError) throw saleError;

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
    // Limpeza de estado imediata
    setUser(null);
    setStore(null);
    setStoreStatus('no_store');
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
