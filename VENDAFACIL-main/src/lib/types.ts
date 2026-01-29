export type User = {
  id: string; // Corresponds to auth.users.id
  email: string;
  name?: string;
  avatar_url?: string;
  is_admin?: boolean;
};

export type StoreSettings = {
  blockSaleWithoutStock?: boolean;
  confirmBeforeFinalizingSale?: boolean;
  allowSaleWithoutOpenCashRegister?: boolean;
  allowNegativeStock?: boolean;
  defaultProfitMargin?: number;
  defaultMinStock?: number;
  receiptWidth?: '58mm' | '80mm';
};

export type StoreMember = {
  user_id: string;
  store_id: string;
  role: 'admin' | 'staff';
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type Store = {
  id: string;
  user_id: string; // Owner
  name: string;
  cnpj: string;
  legal_name: string;
  logo_url?: string;
  address: { // This is a JSONB field in Supabase
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  phone?: string;
  timezone: string;
  settings: StoreSettings; // This is a JSONB field in Supabase
  members?: StoreMember[]; // This is a joined relation, not a real column
  business_type: string;
  status: 'active' | 'trial' | 'suspended' | 'blocked' | 'deleted';
  trial_used: boolean;
  trial_started_at: string | null;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  category?: string;
  price_cents: number;
  cost_cents?: number;
  stock_qty: number;
  min_stock_qty?: number;
  active: boolean;
  barcode?: string;
  created_at: string;
};

export type Sale = {
  id: string;
  store_id: string;
  created_at: string;
  total_cents: number;
  payment_method: 'cash' | 'pix' | 'card';
  items: SaleItem[];
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  product_name_snapshot: string;
  product_barcode_snapshot?: string | null;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
};

export type CartItem = {
  product_id: string;
  product_name_snapshot: string;
  product_barcode_snapshot?: string | null;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  stock_qty: number;
};

export type CashRegister = {
  id:string;
  store_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount_cents: number;
  closing_amount_cents: number | null;
};

export type Customer = {
    id: string;
    store_id: string;
    name: string;
    email: string;
    phone: string;
    cpf: string | null;
    created_at: string;
};

export type StoreStatus = 'unknown' | 'loading' | 'has' | 'none' | 'error';


// Types for Time-based Access Control
export type StoreAccess = {
    store_id: string;
    plano_nome: string;
    plano_tipo: 'free' | 'weekly' | 'monthly' | 'yearly' | 'vitalicio';
    data_inicio_acesso: string;
    data_fim_acesso: string;
    status_acesso: 'ativo' | 'expirado' | 'bloqueado' | 'aguardando_liberacao';
    origem?: 'hotmart' | 'kiwify' | 'perfectpay' | 'admin' | 'onboarding';
    renovavel: boolean;
    updated_at: string;
    limits?: { max_sales: number; max_customers: number; };
    features?: Record<string, boolean>;
}

export type StoreAccessStatus = {
    acesso_liberado: boolean;
    data_fim_acesso: string | null;
    plano_nome: string;
    mensagem: string;
}

// Types for Subscriptions & Billing
export type SubscriptionEvent = {
    id: number;
    created_at: string;
    provider: 'hotmart' | 'kiwify' | 'perfectpay' | 'admin';
    event_type: string;
    event_id: string; // Unique ID from the provider
    store_id?: string;
    user_id?: string;
    plan_id?: string;
    status: 'processed_access_granted' | 'processed_access_revoked' | 'logged_for_analytics' | 'error_missing_ref' | 'error_invalid_ref' | 'error_unknown_plan' | 'error_db_update' | 'error_exception';
    raw_payload: Record<string, any>;
};


// Types for Analytics
export type UserSession = {
  session_id: string;
  store_id: string;
  user_id: string;
  user_agent?: string;
  ip?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  started_at: string;
  last_seen_at: string;
};

export type UserEvent = {
  id: string;
  store_id: string;
  user_id: string;
  session_id: string;
  event_name: string;
  event_group: string;
  metadata: Record<string, any>;
  created_at: string;
};

export type AnalyticsSummary = {
  total_profile_views: number;
  total_unique_clicks: number;
  total_reports_opened: number;
  total_events: number;
  top_event_names: { event_name: string; count: number }[];
  events_by_day: { day: string; count: number }[];
};
