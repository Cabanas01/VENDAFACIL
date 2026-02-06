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

export type OrderItemStatus = 'pending' | 'done' | 'canceled';

export type SaleItem = {
  readonly id: string;
  readonly store_id: string;
  readonly product_id: string;
  readonly comanda_id?: string | null;
  readonly sale_id?: string | null;
  readonly quantity: number;
  readonly unit_price: number;
  readonly subtotal_cents: number; // Mapeado da coluna física/gerada
  readonly status: OrderItemStatus;
  readonly created_at: string;
  readonly product_name_snapshot?: string;
  readonly destino_preparo?: string;
};

export type Sale = {
  id: string;
  store_id: string;
  customer_id?: string | null;
  comanda_id?: string | null;
  created_at: string;
  total_cents: number;
  payment_method: string | null;
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

export type ComandaTotalView = {
  id: string;
  store_id: string;
  numero: string; 
  mesa: string | null;
  status: string;
  cliente_nome: string | null;
  total_cents: number;
};

export type PainelProducaoView = {
  item_id: string;
  comanda_id: string;
  comanda_numero: string;
  mesa: string | null;
  produto: string;
  qty: number;
  status: OrderItemStatus;
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
