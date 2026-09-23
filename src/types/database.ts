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

export type UserRole = 'admin' | 'executive' | 'agent' | 'seller' | 'community'

export type PaymentMethod = 'stripe' | 'flutterwave' | 'crypto' | 'manual'

export type InvestmentMethod = 'bank_transfer' | 'mobile_money' | 'other' | 'stripe'

export type InvestmentStatus = 'pending' | 'confirmed' | 'rejected'

export type DocumentStatus = 'draft' | 'sent' | 'signed' | 'archived'

export type SuggestionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'

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
          agent_id: string
          land_id: string
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
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          land_id: string
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
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          land_id?: string
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
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions_crypto: {
        Row: {
          id: string
          payment_id: string | null
          wallet_address: string
          crypto_type: 'ETH' | 'USDT' | 'BTC' | 'WBTC' | 'other'
          crypto_amount: number
          usd_rate: number | null
          ugx_rate: number | null
          tx_hash: string
          chain_id: number
          status: 'submitted' | 'confirmed' | 'failed'
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          payment_id?: string | null
          wallet_address: string
          crypto_type: 'ETH' | 'USDT' | 'BTC' | 'WBTC' | 'other'
          crypto_amount: number
          usd_rate?: number | null
          ugx_rate?: number | null
          tx_hash: string
          chain_id?: number
          status?: 'submitted' | 'confirmed' | 'failed'
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string | null
          wallet_address?: string
          crypto_type?: 'ETH' | 'USDT' | 'BTC' | 'WBTC' | 'other'
          crypto_amount?: number
          usd_rate?: number | null
          ugx_rate?: number | null
          tx_hash?: string
          chain_id?: number
          status?: 'submitted' | 'confirmed' | 'failed'
          created_by?: string
          created_at?: string
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
          investment_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          provider: 'stripe' | 'flutterwave'
          event_key: string
          function_name: string
          payment_id?: string | null
          investment_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: 'stripe' | 'flutterwave'
          event_key?: string
          function_name?: string
          payment_id?: string | null
          investment_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          land_id: string | null
          investor_id: string | null
          investment_id: string | null
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
          land_id?: string | null
          investor_id?: string | null
          investment_id?: string | null
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
          land_id?: string | null
          investor_id?: string | null
          investment_id?: string | null
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
          accuracy_m: number | null
          captured_at: string
        }
        Insert: {
          id?: string
          land_id: string
          uploader_id: string
          file_path?: string | null
          latitude?: number | null
          longitude?: number | null
          accuracy_m?: number | null
          captured_at?: string
        }
        Update: {
          id?: string
          land_id?: string
          uploader_id?: string
          file_path?: string | null
          latitude?: number | null
          longitude?: number | null
          accuracy_m?: number | null
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
      investor_consents: {
        Row: {
          id: string
          agent_id: string
          terms_version: string
          accepted_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          terms_version: string
          accepted_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          terms_version?: string
          accepted_at?: string
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
      suggestions: {
        Row: {
          id: string
          land_id: string
          submitter_id: string
          title: string
          body: string
          status: SuggestionStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          land_id: string
          submitter_id: string
          title: string
          body: string
          status?: SuggestionStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          land_id?: string
          submitter_id?: string
          title?: string
          body?: string
          status?: SuggestionStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      suggestion_comments: {
        Row: {
          id: string
          suggestion_id: string
          author_id: string
          body: string
          status_from: SuggestionStatus | null
          status_to: SuggestionStatus | null
          created_at: string
        }
        Insert: {
          id?: string
          suggestion_id: string
          author_id: string
          body: string
          status_from?: SuggestionStatus | null
          status_to?: SuggestionStatus | null
          created_at?: string
        }
        Update: {
          id?: string
          suggestion_id?: string
          author_id?: string
          body?: string
          status_from?: SuggestionStatus | null
          status_to?: SuggestionStatus | null
          created_at?: string
        }
        Relationships: []
      }
      media_videos: {
        Row: {
          id: string
          land_id: string
          uploader_id: string
          title: string
          land_title: string
          file_path: string
          mime_type: 'video/mp4' | 'video/quicktime'
          size_bytes: number
          captured_at: string
          created_at: string
        }
        Insert: {
          id?: string
          land_id: string
          uploader_id: string
          title: string
          land_title: string
          file_path: string
          mime_type: 'video/mp4' | 'video/quicktime'
          size_bytes: number
          captured_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          land_id?: string
          uploader_id?: string
          title?: string
          land_title?: string
          file_path?: string
          mime_type?: 'video/mp4' | 'video/quicktime'
          size_bytes?: number
          captured_at?: string
          created_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          id: string
          user_id: string
          display_name: string
          location: string | null
          bio: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name: string
          location?: string | null
          bio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string
          location?: string | null
          bio?: string | null
          created_at?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          id: string
          author_user_id: string
          parent_id: string | null
          body: string
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_user_id: string
          parent_id?: string | null
          body: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_user_id?: string
          parent_id?: string | null
          body?: string
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      incubation_events: {
        Row: {
          id: string
          title: string
          description: string | null
          starts_at: string
          ends_at: string | null
          location: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          starts_at: string
          ends_at?: string | null
          location?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          starts_at?: string
          ends_at?: string | null
          location?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cargo_shipments: {
        Row: {
          id: string
          origin: string
          destination: string
          description: string
          expected_at: string
          status: 'ordered' | 'in_transit' | 'at_port' | 'cleared' | 'delivered'
          assignee_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          origin: string
          destination: string
          description: string
          expected_at: string
          status?: 'ordered' | 'in_transit' | 'at_port' | 'cleared' | 'delivered'
          assignee_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          origin?: string
          destination?: string
          description?: string
          expected_at?: string
          status?: 'ordered' | 'in_transit' | 'at_port' | 'cleared' | 'delivered'
          assignee_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cargo_documents: {
        Row: {
          id: string
          shipment_id: string
          uploader_id: string
          title: string
          file_path: string
          mime_type: string
          size_bytes: number
          created_at: string
        }
        Insert: {
          id?: string
          shipment_id: string
          uploader_id: string
          title: string
          file_path: string
          mime_type: string
          size_bytes: number
          created_at?: string
        }
        Update: {
          id?: string
          shipment_id?: string
          uploader_id?: string
          title?: string
          file_path?: string
          mime_type?: string
          size_bytes?: number
          created_at?: string
        }
        Relationships: []
      }
      cargo_approvals: {
        Row: {
          id: string
          shipment_id: string
          stage: 'ordered' | 'in_transit' | 'at_port' | 'cleared' | 'delivered'
          approver_id: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shipment_id: string
          stage: 'ordered' | 'in_transit' | 'at_port' | 'cleared' | 'delivered'
          approver_id: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shipment_id?: string
          stage?: 'ordered' | 'in_transit' | 'at_port' | 'cleared' | 'delivered'
          approver_id?: string
          note?: string | null
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
      analytics_portfolio_snapshot: {
        Args: Record<string, never>
        Returns: Json
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

      executive_land_map: {
        Args: Record<string, never>
        Returns: {
          land_id: string
          title: string
          location: string | null
          status: string
          latitude: number | null
          longitude: number | null
          boundary_geojson: Json | null
        }[]
      }
      executive_land_site: {
        Args: { p_land_id: string }
        Returns: {
          land_id: string
          title: string
          location: string | null
          status: string
          latitude: number | null
          longitude: number | null
          boundary_geojson: Json | null
        }[]
      }
      current_investment_terms_version: {
        Args: Record<string, never>
        Returns: string
      }
      agent_contribution_block_reason: {
        Args: { p_agent_id: string }
        Returns: string | null
      }
      executive_contribution_block_reason: {
        Args: { p_executive_id: string }
        Returns: string | null
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

export type TransactionCrypto = Database['public']['Tables']['transactions_crypto']['Row']
