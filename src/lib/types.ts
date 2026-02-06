export type User = {
  id: string;
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
  user_id: string;
  name: string;
  cnpj: string;
  legal_name: string;
  logo_url?: string;
  address: {
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
  settings: StoreSettings;
  members?: StoreMember[];
  business_type: string;
  status: 'active' | 'trial' | 'suspended' | 'blocked' | 'deleted';
  trial_used: boolean;
  trial_started_at: string | null;
  use_comanda: boolean;
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
  production_target: 'cozinha' | 'bar' | 'nenhum';
  prep_time_minutes: number;
};

export type OrderItemStatus = 'pending' | 'done' | 'cancelled';

export type SaleItem = {
  id: string;
  store_id: string;
  product_id: string;
  sale_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  status: OrderItemStatus;
  created_at: string;
  product_name_snapshot?: string;
  destino_preparo?: string;
};

export type SaleStatus = 'open' | 'paid' | 'cancelled';

export type Sale = {
  id: string;
  store_id: string;
  customer_id?: string | null;
  created_at: string;
  total_cents: number;
  payment_method: string | null;
  status: SaleStatus;
  mesa?: string | null;
  cliente_nome?: string | null;
  items?: SaleItem[];
};

export type CartItem = {
  product_id: string;
  product_name_snapshot: string;
  product_barcode_snapshot?: string | null;
  qty: number;
  unit_price_cents: number;
  subtotal_cents: number;
  stock_qty: number;
  destino_preparo: string;
};

export type CashRegister = {
  id: string;
  store_id: string;
  opened_by: string;
  closed_by?: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_amount_cents: number;
  closing_amount_cents: number | null;
};

export type Customer = {
    id: string;
    store_id: string;
    name: string;
    email?: string | null;
    phone: string | null;
    cpf: string | null;
    created_at: string;
};

export type ProductionSnapshotView = {
  item_id: string;
  sale_id: string;
  sale_number: string;
  mesa: string | null;
  produto: string;
  qty: number;
  status: OrderItemStatus;
  destino_preparo: string;
  created_at: string;
  store_id: string;
};

export type TableInfo = {
  id: string;
  store_id: string;
  number: number;
  status: string;
  public_token: string;
};

export type StoreAccessStatus = {
    acesso_liberado: boolean;
    data_fim_acesso: string | null;
    plano_nome: string;
    plano_tipo: string | null;
    mensagem: string;
}
