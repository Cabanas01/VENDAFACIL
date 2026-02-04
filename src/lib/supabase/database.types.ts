export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      order_items: {
        Row: {
          id: string
          store_id: string
          product_id: string
          comanda_id: string | null
          sale_id: string | null
          quantity: number
          unit_price: number
          line_total: number
          status: 'pending' | 'queued' | 'in_progress' | 'done' | 'canceled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          comanda_id?: string | null
          sale_id?: string | null
          quantity: number
          unit_price: number
          status?: 'pending' | 'queued' | 'in_progress' | 'done' | 'canceled'
        }
        Update: {
          status?: 'pending' | 'queued' | 'in_progress' | 'done' | 'canceled'
          sale_id?: string | null
          quantity?: number
        }
      }
      cash_registers: {
        Row: {
          id: string
          store_id: string
          opened_by: string
          closed_by: string | null
          opened_at: string
          closed_at: string | null
          opening_amount: number
          closing_amount: number | null
          status: string
        }
      }
      comandas: {
        Row: {
          id: string
          store_id: string
          numero: number
          mesa: string | null
          status: string
          cliente_nome: string | null
          created_at: string
        }
      }
      sales: {
        Row: {
          id: string
          store_id: string
          cash_register_id: string | null
          total_amount: number
          payment_method_id: string | null
          created_at: string
        }
      }
    }
    Views: {
      comanda_itens: {
        Row: {
          id: string
          comanda_id: string
          product_id: string
          product_name: string
          qty: number
          unit_price: number
          status: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          product_name: string
          qty: number
          unit_price: number
        }
      }
    }
    Functions: {
      rpc_add_item_to_comanda: {
        Args: {
          p_comanda_id: string
          p_product_id: string
          p_quantity: number
        }
        Returns: string
      }
      rpc_mark_order_item_done: {
        Args: {
          p_item_id: string
        }
        Returns: boolean
      }
      rpc_close_comanda_to_sale: {
        Args: {
          p_comanda_id: string
          p_payment_method_id: string
        }
        Returns: Json
      }
    }
  }
}
