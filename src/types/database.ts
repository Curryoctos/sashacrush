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
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role: UserRole
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          full_name?: string | null
          created_at?: string
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
          status?: string
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
        }
        Insert: {
          id?: string
          payment_id: string
          seller_id: string
          receipt_number: string
          pdf_path?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          seller_id?: string
          receipt_number?: string
          pdf_path?: string | null
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
      send_chat_auto_reply: {
        Args: { p_land_id: string; p_body: string }
        Returns: undefined
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
