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
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
};

export type CartItem = Omit<SaleItem, 'id' | 'sale_id'> & { stock_qty: number };

export type CashRegister = {
  id:string;
  store_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount_cents: number;
  closing_amount_cents: number | null;
};
