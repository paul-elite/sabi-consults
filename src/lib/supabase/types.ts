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
      properties: {
        Row: {
          id: string
          title: string
          description: string
          price: number
          price_label: string | null
          type: 'sale' | 'rent'
          property_type: 'house' | 'apartment' | 'land' | 'commercial' | 'villa'
          district: string
          address: string
          latitude: number
          longitude: number
          bedrooms: number | null
          bathrooms: number | null
          size: number | null
          images: string[]
          features: string[]
          status: 'available' | 'sold' | 'rented' | 'pending'
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          price: number
          price_label?: string | null
          type: 'sale' | 'rent'
          property_type: 'house' | 'apartment' | 'land' | 'commercial' | 'villa'
          district: string
          address: string
          latitude: number
          longitude: number
          bedrooms?: number | null
          bathrooms?: number | null
          size?: number | null
          images?: string[]
          features?: string[]
          status?: 'available' | 'sold' | 'rented' | 'pending'
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          price?: number
          price_label?: string | null
          type?: 'sale' | 'rent'
          property_type?: 'house' | 'apartment' | 'land' | 'commercial' | 'villa'
          district?: string
          address?: string
          latitude?: number
          longitude?: number
          bedrooms?: number | null
          bathrooms?: number | null
          size?: number | null
          images?: string[]
          features?: string[]
          status?: 'available' | 'sold' | 'rented' | 'pending'
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      inquiries: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          message: string
          property_id: string | null
          status: 'new' | 'contacted' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          message: string
          property_id?: string | null
          status?: 'new' | 'contacted' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          message?: string
          property_id?: string | null
          status?: 'new' | 'contacted' | 'closed'
          created_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'staff'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'staff'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'staff'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyInsert = Database['public']['Tables']['properties']['Insert']
export type PropertyUpdate = Database['public']['Tables']['properties']['Update']

export type Inquiry = Database['public']['Tables']['inquiries']['Row']
export type InquiryInsert = Database['public']['Tables']['inquiries']['Insert']

export type AdminUser = Database['public']['Tables']['admin_users']['Row']
