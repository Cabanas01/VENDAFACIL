
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
      cash_registers: {
        Row: {
          id: string
          store_id: string
          opened_at: string
          closed_at: string | null
          opening_amount_cents: number
          closing_amount_cents: number | null
        }
        Insert: {
          id?: string
          store_id: string
          opened_at?: string
          closed_at?: string | null
          opening_amount_cents: number
          closing_amount_cents?: number | null
        }
        Update: {
          id?: string
          store_id?: string
          opened_at?: string
          closed_at?: string | null
          opening_amount_cents?: number
          closing_amount_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_store_id_fkey"
            columns: ["store_id"]
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          id: string
          store_id: string
          name: string
          email: string
          phone: string
          cpf: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          email: string
          phone: string
          cpf?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          email?: string
          phone?: string
          cpf?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          category: string | null
          price_cents: number
          cost_cents: number | null
          stock_qty: number
          min_stock_qty: number | null
          active: boolean
          barcode: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          category?: string | null
          price_cents: number
          cost_cents?: number | null
          stock_qty?: number
          min_stock_qty?: number | null
          active?: boolean
          barcode?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          category?: string | null
          price_cents?: number
          cost_cents?: number | null
          stock_qty?: number
          min_stock_qty?: number | null
          active?: boolean
          barcode?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          product_name_snapshot: string
          product_barcode_snapshot: string | null
          quantity: number
          unit_price_cents: number
          subtotal_cents: number
        }
        Insert: {
          id?: string
          sale_id: string
          product_id: string
          product_name_snapshot: string
          product_barcode_snapshot?: string | null
          quantity: number
          unit_price_cents: number
          subtotal_cents: number
        }
        Update: {
          id?: string
          sale_id?: string
          product_id?: string
          product_name_snapshot?: string
          product_barcode_snapshot?: string | null
          quantity?: number
          unit_price_cents?: number
          subtotal_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          }
        ]
      }
      sales: {
        Row: {
          id: string
          store_id: string
          created_at: string
          total_cents: number
          payment_method: "cash" | "pix" | "card"
        }
        Insert: {
          id?: string
          store_id: string
          created_at?: string
          total_cents: number
          payment_method: "cash" | "pix" | "card"
        }
        Update: {
          id?: string
          store_id?: string
          created_at?: string
          total_cents?: number
          payment_method?: "cash" | "pix" | "card"
        }
        Relationships: [
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
      store_access: {
        Row: {
          store_id: string
          plano_nome: string
          plano_tipo: "free" | "weekly" | "monthly" | "yearly" | "vitalicio"
          data_inicio_acesso: string
          data_fim_acesso: string
          status_acesso:
            | "ativo"
            | "expirado"
            | "bloqueado"
            | "aguardando_liberacao"
          origem:
            | "hotmart"
            | "kiwify"
            | "perfectpay"
            | "admin"
            | "onboarding"
            | "manual_admin"
            | null
          renovavel: boolean
          updated_at: string
          limits: Json | null
          features: Json | null
        }
        Insert: {
          store_id: string
          plano_nome: string
          plano_tipo: "free" | "weekly" | "monthly" | "yearly" | "vitalicio"
          data_inicio_acesso?: string
          data_fim_acesso: string
          status_acesso:
            | "ativo"
            | "expirado"
            | "bloqueado"
            | "aguardando_liberacao"
          origem?:
            | "hotmart"
            | "kiwify"
            | "perfectpay"
            | "admin"
            | "onboarding"
            | "manual_admin"
            | null
          renovavel?: boolean
          updated_at?: string
          limits?: Json | null
          features?: Json | null
        }
        Update: {
          store_id?: string
          plano_nome?: string
          plano_tipo?: "free" | "weekly" | "monthly" | "yearly" | "vitalicio"
          data_inicio_acesso?: string
          data_fim_acesso?: string
          status_acesso?:
            | "ativo"
            | "expirado"
            | "bloqueado"
            | "aguardando_liberacao"
          origem?:
            | "hotmart"
            | "kiwify"
            | "perfectpay"
            | "admin"
            | "onboarding"
            | "manual_admin"
            | null
          renovavel?: boolean
          updated_at?: string
          limits?: Json | null
          features?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "store_access_store_id_fkey"
            columns: ["store_id"]
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
      store_members: {
        Row: {
          user_id: string
          store_id: string
          role: "admin" | "staff"
          created_at: string
        }
        Insert: {
          user_id: string
          store_id: string
          role: "admin" | "staff"
          created_at?: string
        }
        Update: {
          user_id?: string
          store_id?: string
          role?: "admin" | "staff"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stores: {
        Row: {
          id: string
          user_id: string
          name: string
          cnpj: string
          legal_name: string
          logo_url: string | null
          address: Json | null
          phone: string | null
          timezone: string
          settings: Json | null
          business_type: string | null
          status: string | null
          created_at: string
          trial_used: boolean | null
          trial_started_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          cnpj: string
          legal_name: string
          logo_url?: string | null
          address?: Json | null
          phone?: string | null
          timezone?: string
          settings?: Json | null
          business_type?: string | null
          status?: string | null
          created_at?: string
          trial_used?: boolean | null
          trial_started_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          cnpj?: string
          legal_name?: string
          logo_url?: string | null
          address?: Json | null
          phone?: string | null
          timezone?: string
          settings?: Json | null
          business_type?: string | null
          status?: string | null
          created_at?: string
          trial_used?: boolean | null
          trial_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_events: {
        Row: {
          id: number
          created_at: string
          provider: "hotmart" | "kiwify" | "perfectpay" | "admin"
          event_type: string
          event_id: string
          store_id: string | null
          user_id: string | null
          plan_id: string | null
          status: string
          raw_payload: Json
        }
        Insert: {
          id?: number
          created_at?: string
          provider: "hotmart" | "kiwify" | "perfectpay" | "admin"
          event_type: string
          event_id: string
          store_id?: string | null
          user_id?: string | null
          plan_id?: string | null
          status: string
          raw_payload: Json
        }
        Update: {
          id?: number
          created_at?: string
          provider?: "hotmart" | "kiwify" | "perfectpay" | "admin"
          event_type?: string
          event_id?: string
          store_id?: string | null
          user_id?: string | null
          plan_id?: string | null
          status?: string
          raw_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_store_id_fkey"
            columns: ["store_id"]
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string | null
          name: string | null
          avatar_url: string | null
          is_admin: boolean | null
          is_blocked: boolean | null
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          is_admin?: boolean | null
          is_blocked?: boolean | null
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          is_admin?: boolean | null
          is_blocked?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_store_access: {
        Args: {
          p_store_id: string
          p_plano_tipo: string
          p_duracao_dias: number
          p_origem: string
          p_renovavel: boolean
        }
        Returns: undefined
      }
      create_new_store: {
        Args: {
          p_name: string
          p_legal_name: string
          p_cnpj: string
          p_address: Json
          p_phone: string
          p_timezone: string
        }
        Returns: Record<string, unknown>
      }
      decrement_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      delete_user_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_analytics_summary: {
        Args: {
          p_store_id: string
          p_from: string
          p_to: string
        }
        Returns: Json
      }
      get_billing_analytics: {
        Args: { p_from: string; p_to: string }
        Returns: {
          total_revenue: number
          new_subscriptions: number
          cancellations: number
          revenue_by_provider: Json[]
          recent_events: Json[]
        }[]
      }
      get_store_access_status: {
        Args: { p_store_id: string }
        Returns: Json
      }
      is_saas_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      rpc_register_unique_click: {
        Args: {
          p_store_id: string
          p_session_id: string
          p_target: string
          p_metadata: Json
        }
        Returns: undefined
      }
      start_trial: {
        Args: { p_store_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
