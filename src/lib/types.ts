export type User = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  is_admin?: boolean;
};

export type BootstrapStatus = {
  has_store: boolean;
  is_member: boolean;
  is_admin: boolean;
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
  destino_preparo: 'cozinha' | 'bar' | 'nenhum';
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

export type Comanda = {
  id: string;
  store_id: string;
  numero_comanda: string;
  mesa_cliente?: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  created_at: string;
  closed_at?: string;
};

export type ComandaItem = {
  id: string;
  comanda_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  status_preparo: 'pendente' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado';
  created_at: string;
  product_name?: string; // vindo de join ou view
};

export type ComandaTotalView = {
  id: string;
  numero_comanda: string;
  mesa_cliente: string;
  status: string;
  total_cents: number;
  itens_count: number;
};

export type PainelProducaoView = {
  id: string; // comanda_item_id
  numero_comanda: string;
  mesa_cliente: string;
  nome_produto: string;
  quantidade: number;
  status_item: string;
  created_at: string;
};

export type StoreStatus = 
  | 'loading_auth'
  | 'loading_status'
  | 'ready'
  | 'no_store'
  | 'error';

export type StoreAccessStatus = {
    acesso_liberado: boolean;
    data_fim_acesso: string | null;
    plano_nome: string;
    plano_tipo: string | null;
    mensagem: string;
}
