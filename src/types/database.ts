/**
 * Supabase database types.
 *
 * This file is a placeholder for generated types. After linking your Supabase
 * project, regenerate with:
 *
 *   npx supabase gen types typescript --local > src/types/database.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'executive' | 'agent' | 'seller'

export type PaymentMethod = 'stripe' | 'flutterwave' | 'crypto' | 'manual'

export type InvestmentMethod = 'bank_transfer' | 'mobile_money' | 'other'

export type InvestmentStatus = 'pending' | 'confirmed' | 'rejected'

export type DocumentStatus = 'draft' | 'sent' | 'signed' | 'archived'

export type ChatChannel = 'seller_channel' | 'executive_channel'

export type LandRecordStatus = 'active' | 'archived'

export interface LandRecordFormValues {
  title: string
  description: string
  location: string
  total_value_usd: string
  latitude: string
  longitude: string
  seller_id: string
  status: LandRecordStatus
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: UserRole
          full_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role: UserRole
          full_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          full_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      land_records: {
        Row: {
          id: string
          title: string
          description: string | null
          location: string | null
          total_value_usd: number
          seller_id: string | null
          latitude: number | null
          longitude: number | null
          boundary_geojson: Json | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          location?: string | null
          total_value_usd: number
          seller_id?: string | null
          latitude?: number | null
          longitude?: number | null
          boundary_geojson?: Json | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          location?: string | null
          total_value_usd?: number
          seller_id?: string | null
          latitude?: number | null
          longitude?: number | null
          boundary_geojson?: Json | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          land_id: string
          amount_usd: number
          amount_ugx: number | null
          method: PaymentMethod | null
          rate_used: number | null
          stripe_payment_intent_id: string | null
          flutterwave_tx_ref: string | null
          gateway_checkout_url: string | null
          mobile_money_network: 'mtn' | 'airtel' | null
          manual_reference: string | null
          payer_phone: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          land_id: string
          amount_usd: number
          amount_ugx?: number | null
          method?: PaymentMethod | null
          rate_used?: number | null
          stripe_payment_intent_id?: string | null
          flutterwave_tx_ref?: string | null
          gateway_checkout_url?: string | null
          mobile_money_network?: 'mtn' | 'airtel' | null
          manual_reference?: string | null
          payer_phone?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          land_id?: string
          amount_usd?: number
          amount_ugx?: number | null
          method?: PaymentMethod | null
          rate_used?: number | null
          stripe_payment_intent_id?: string | null
          flutterwave_tx_ref?: string | null
          gateway_checkout_url?: string | null
          mobile_money_network?: 'mtn' | 'airtel' | null
          manual_reference?: string | null
          payer_phone?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          id: string
          executive_id: string
          amount_usd: number
          amount_ugx: number | null
          rate_used: number | null
          method: InvestmentMethod
          reference: string
          notes: string | null
          status: InvestmentStatus
          confirmed_by: string | null
          confirmed_at: string | null
          rejection_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          executive_id: string
          amount_usd: number
          amount_ugx?: number | null
          rate_used?: number | null
          method: InvestmentMethod
          reference: string
          notes?: string | null
          status?: InvestmentStatus
          confirmed_by?: string | null
          confirmed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          executive_id?: string
          amount_usd?: number
          amount_ugx?: number | null
          rate_used?: number | null
          method?: InvestmentMethod
          reference?: string
          notes?: string | null
          status?: InvestmentStatus
          confirmed_by?: string | null
          confirmed_at?: string | null
          rejection_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          payment_id: string
          seller_id: string
          receipt_number: string
          pdf_path: string | null
          created_at: string
          amount_usd: number
          amount_ugx: number | null
          rate_used: number | null
          land_id: string | null
          land_title: string | null
        }
        Insert: {
          id?: string
          payment_id: string
          seller_id: string
          receipt_number: string
          pdf_path?: string | null
          created_at?: string
          amount_usd: number
          amount_ugx?: number | null
          rate_used?: number | null
          land_id?: string | null
          land_title?: string | null
        }
        Update: {
          id?: string
          payment_id?: string
          seller_id?: string
          receipt_number?: string
          pdf_path?: string | null
          created_at?: string
          amount_usd?: number
          amount_ugx?: number | null
          rate_used?: number | null
          land_id?: string | null
          land_title?: string | null
        }
        Relationships: []
      }
      gateway_webhook_events: {
        Row: {
          id: string
          provider: 'stripe' | 'flutterwave'
          event_key: string
          function_name: string
          payment_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          provider: 'stripe' | 'flutterwave'
          event_key: string
          function_name: string
          payment_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: 'stripe' | 'flutterwave'
          event_key?: string
          function_name?: string
          payment_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          land_id: string
          uploader_id: string
          assigned_to: string | null
          signed_by: string | null
          file_path: string | null
          title: string | null
          status: DocumentStatus
          signature_hash: string | null
          signed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          land_id: string
          uploader_id: string
          assigned_to?: string | null
          signed_by?: string | null
          file_path?: string | null
          title?: string | null
          status?: DocumentStatus
          signature_hash?: string | null
          signed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          land_id?: string
          uploader_id?: string
          assigned_to?: string | null
          signed_by?: string | null
          file_path?: string | null
          title?: string | null
          status?: DocumentStatus
          signature_hash?: string | null
          signed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          id: string
          land_id: string
          uploader_id: string
          file_path: string | null
          latitude: number | null
          longitude: number | null
          captured_at: string
        }
        Insert: {
          id?: string
          land_id: string
          uploader_id: string
          file_path?: string | null
          latitude?: number | null
          longitude?: number | null
          captured_at?: string
        }
        Update: {
          id?: string
          land_id?: string
          uploader_id?: string
          file_path?: string | null
          latitude?: number | null
          longitude?: number | null
          captured_at?: string
        }
        Relationships: []
      }
      in_app_notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          href: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          href?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string
          href?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          channel: ChatChannel
          land_id: string | null
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          channel: ChatChannel
          land_id?: string | null
          sender_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          channel?: ChatChannel
          land_id?: string | null
          sender_id?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_advisory_lock: {
        Args: { lock_id: number }
        Returns: undefined
      }
      allocate_receipt_number: {
        Args: Record<string, never>
        Returns: string
      }
      write_audit_log_as: {
        Args: {
          p_actor_id: string | null
          p_action: string
          p_entity_type: string
          p_entity_id: string
          p_metadata?: Json | null
        }
        Returns: undefined
      }
      send_chat_auto_reply: {
        Args: { p_land_id: string; p_body: string }
        Returns: undefined
      }
      executive_deal_summaries: {
        Args: Record<string, never>
        Returns: {
          land_id: string
          title: string
          location: string | null
          status: string
          total_value_usd: number
          seller_name: string | null
          pending_docs: number
          signed_docs: number
          confirmed_payments: number
          pending_payments: number
        }[]
      }
      executive_deal_summary: {
        Args: { p_land_id: string }
        Returns: {
          land_id: string
          title: string
          location: string | null
          status: string
          total_value_usd: number
          seller_name: string | null
          pending_docs: number
          signed_docs: number
          confirmed_payments: number
          pending_payments: number
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type LandRecord = Database['public']['Tables']['land_records']['Row']

export type LandRecordInsert = Database['public']['Tables']['land_records']['Insert']

export type LandRecordUpdate = Database['public']['Tables']['land_records']['Update']

export type SellerOption = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'email' | 'full_name'
>

export type Investment = Database['public']['Tables']['investments']['Row']

export type InvestmentInsert = Database['public']['Tables']['investments']['Insert']

export type InvestmentUpdate = Database['public']['Tables']['investments']['Update']
