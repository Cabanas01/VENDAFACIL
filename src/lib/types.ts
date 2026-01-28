export type User = {
  id: string; // Corresponds to auth.users.id
  email: string;
  name?: string;
  avatar_url?: string;
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

export type StoreStatus = 'unknown' | 'loading' | 'has' | 'none' | 'error';


// Types for SaaS Billing & Entitlements
export type Plan = {
    id: 'free' | 'weekly' | 'monthly' | 'yearly';
    name: string;
    price_cents: number;
    billing_period: 'day' | 'week' | 'month' | 'year';
    features: { [key: string]: boolean };
    limits: { [key: string]: number };
};

export type SubscriptionStatus = 'trialing' | 'active' | 'expired' | 'canceled' | 'past_due';

export type Subscription = {
    id: string;
    user_id: string;
    store_id: string;
    plan_id: Plan['id'];
    status: SubscriptionStatus;
    started_at: string;
    trial_ends_at?: string | null;
    current_period_end: string;
    provider: 'kiwify' | 'manual';
    provider_subscription_id?: string | null;
    provider_customer_id?: string | null;
    last_payment_at?: string | null;
};

export type Entitlement = {
    store_id: string;
    plan_id: Plan['id'];
    is_paying: boolean;
    access_until: string;
    features: { [key: string]: boolean };
    limits: { [key: string]: number };
    updated_at: string;
};
