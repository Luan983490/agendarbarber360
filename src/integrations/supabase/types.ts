export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          created_at: string | null
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          value?: string
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          barbershop_id: string | null
          context: Json | null
          created_at: string
          duration_ms: number | null
          error_stack: string | null
          id: string
          level: string
          message: string
          method: string
          service: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          barbershop_id?: string | null
          context?: Json | null
          created_at?: string
          duration_ms?: number | null
          error_stack?: string | null
          id?: string
          level: string
          message: string
          method: string
          service: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string | null
          context?: Json | null
          created_at?: string
          duration_ms?: number | null
          error_stack?: string | null
          id?: string
          level?: string
          message?: string
          method?: string
          service?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "app_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      auth_failures: {
        Row: {
          attempt_count: number | null
          id: string
          ip_address: string
          last_attempt: string | null
        }
        Insert: {
          attempt_count?: number | null
          id?: string
          ip_address: string
          last_attempt?: string | null
        }
        Update: {
          attempt_count?: number | null
          id?: string
          ip_address?: string
          last_attempt?: string | null
        }
        Relationships: []
      }
      barber_blocks: {
        Row: {
          barber_id: string
          block_date: string
          created_at: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          barber_id: string
          block_date: string
          created_at?: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          barber_id?: string
          block_date?: string
          created_at?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_blocks_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_schedule_overrides: {
        Row: {
          barber_id: string
          created_at: string
          day_of_week: number
          end_date: string
          id: string
          is_day_off: boolean
          period1_end: string | null
          period1_start: string | null
          period2_end: string | null
          period2_start: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          day_of_week: number
          end_date: string
          id?: string
          is_day_off?: boolean
          period1_end?: string | null
          period1_start?: string | null
          period2_end?: string | null
          period2_start?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          day_of_week?: number
          end_date?: string
          id?: string
          is_day_off?: boolean
          period1_end?: string | null
          period1_start?: string | null
          period2_end?: string | null
          period2_start?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_schedule_overrides_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_services: {
        Row: {
          barber_id: string
          created_at: string
          id: string
          service_id: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          id?: string
          service_id: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_working_hours: {
        Row: {
          barber_id: string
          created_at: string
          day_of_week: number
          id: string
          is_day_off: boolean
          period1_end: string | null
          period1_start: string | null
          period2_end: string | null
          period2_start: string | null
          updated_at: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          day_of_week: number
          id?: string
          is_day_off?: boolean
          period1_end?: string | null
          period1_start?: string | null
          period2_end?: string | null
          period2_start?: string | null
          updated_at?: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          is_day_off?: boolean
          period1_end?: string | null
          period1_start?: string | null
          period2_end?: string | null
          period2_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_working_hours_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          barbershop_id: string
          created_at: string
          deleted_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          phone: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: string
          amenities: string[] | null
          city: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          email: string | null
          facebook_url: string | null
          has_active_barbers: boolean
          id: string
          image_url: string | null
          instagram_url: string | null
          is_public: boolean
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood: string | null
          opening_hours: Json | null
          owner_id: string
          payment_methods: string[] | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          slug: string
          state: string | null
          street_number: string | null
          total_reviews: number | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          has_active_barbers?: boolean
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_public?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          opening_hours?: Json | null
          owner_id: string
          payment_methods?: string[] | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          slug?: string
          state?: string | null
          street_number?: string | null
          total_reviews?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          has_active_barbers?: boolean
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_public?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          opening_hours?: Json | null
          owner_id?: string
          payment_methods?: string[] | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          slug?: string
          state?: string | null
          street_number?: string | null
          total_reviews?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "barbershops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      barbershops_audit: {
        Row: {
          action: string
          barbershop_id: string
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          barbershop_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          barbershop_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_until: string | null
          created_at: string
          created_by: string | null
          id: string
          ip_address: string
          is_permanent: boolean
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address: string
          is_permanent?: boolean
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_until?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          ip_address?: string
          is_permanent?: boolean
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_ips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "blocked_ips_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      booking_audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          barbershop_id: string
          booking_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          new_status: string | null
          old_data: Json | null
          old_status: string | null
          origin: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          barbershop_id: string
          booking_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          new_status?: string | null
          old_data?: Json | null
          old_status?: string | null
          origin?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          barbershop_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          new_status?: string | null
          old_data?: Json | null
          old_status?: string | null
          origin?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "booking_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "booking_audit_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_audit_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_products: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_products_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          quantity: number
          service_id: string
          unit_price: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          quantity?: number
          service_id: string
          unit_price: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          quantity?: number
          service_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          barber_id: string | null
          barbershop_id: string
          booking_date: string
          booking_end_time: string | null
          booking_time: string
          client_id: string | null
          client_name: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_external_booking: boolean | null
          notes: string | null
          service_id: string
          status: string | null
          total_price: number
          updated_at: string
        }
        Insert: {
          barber_id?: string | null
          barbershop_id: string
          booking_date: string
          booking_end_time?: string | null
          booking_time: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_external_booking?: boolean | null
          notes?: string | null
          service_id: string
          status?: string | null
          total_price: number
          updated_at?: string
        }
        Update: {
          barber_id?: string | null
          barbershop_id?: string
          booking_date?: string
          booking_end_time?: string | null
          booking_time?: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_external_booking?: boolean | null
          notes?: string | null
          service_id?: string
          status?: string | null
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_loyalty_points: {
        Row: {
          barbershop_id: string
          client_id: string
          created_at: string
          id: string
          points_balance: number
          total_points_earned: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          client_id: string
          created_at?: string
          id?: string
          points_balance?: number
          total_points_earned?: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          created_at?: string
          id?: string
          points_balance?: number
          total_points_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_loyalty_points_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_loyalty_points_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_loyalty_points_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_packages: {
        Row: {
          barbershop_id: string
          client_id: string
          created_at: string
          deleted_at: string | null
          expiry_date: string
          id: string
          package_id: string
          purchase_date: string
          sessions_remaining: number
          sessions_total: number
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          expiry_date: string
          id?: string
          package_id: string
          purchase_date?: string
          sessions_remaining: number
          sessions_total: number
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          expiry_date?: string
          id?: string
          package_id?: string
          purchase_date?: string
          sessions_remaining?: number
          sessions_total?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          barbershop_id: string
          benefits: Json | null
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          next_billing_date: string
          plan_description: string | null
          plan_id: string | null
          plan_name: string
          price_monthly: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          benefits?: Json | null
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          next_billing_date: string
          plan_description?: string | null
          plan_id?: string | null
          plan_name: string
          price_monthly: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          benefits?: Json | null
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          next_billing_date?: string
          plan_description?: string | null
          plan_id?: string | null
          plan_name?: string
          price_monthly?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          barbershop_id: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          barbershop_id: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      favorites_audit: {
        Row: {
          action: string
          barbershop_id: string | null
          changed_at: string
          changed_by: string | null
          client_id: string | null
          favorite_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          barbershop_id?: string | null
          changed_at?: string
          changed_by?: string | null
          client_id?: string | null
          favorite_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          barbershop_id?: string | null
          changed_at?: string
          changed_by?: string | null
          client_id?: string | null
          favorite_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          barbershop_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          points_required: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_required: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_required?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          is_active: boolean | null
          points_per_real: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          points_per_real?: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          points_per_real?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          barbershop_id: string
          booking_id: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          points: number
          reward_id: string | null
          transaction_type: string
        }
        Insert: {
          barbershop_id: string
          booking_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reward_id?: string | null
          transaction_type: string
        }
        Update: {
          barbershop_id?: string
          booking_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reward_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "loyalty_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_attempts: {
        Row: {
          attempt_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_id: string
        }
        Insert: {
          attempt_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_id: string
        }
        Update: {
          attempt_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      mfa_recovery_codes: {
        Row: {
          code_hash: string | null
          created_at: string | null
          id: string
          used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash?: string | null
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string | null
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          barbershop_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          sessions_included: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          sessions_included?: number
          updated_at?: string
          validity_days?: number
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sessions_included?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_cards: {
        Row: {
          card_brand: string
          cardholder_name: string
          client_id: string
          created_at: string
          deleted_at: string | null
          expiry_month: number
          expiry_year: number
          id: string
          is_default: boolean | null
          last_four_digits: string
          updated_at: string
        }
        Insert: {
          card_brand: string
          cardholder_name: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          expiry_month: number
          expiry_year: number
          id?: string
          is_default?: boolean | null
          last_four_digits: string
          updated_at?: string
        }
        Update: {
          card_brand?: string
          cardholder_name?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          expiry_month?: number
          expiry_year?: number
          id?: string
          is_default?: boolean | null
          last_four_digits?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_cards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_cards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      products: {
        Row: {
          barbershop_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          mfa_required: boolean | null
          phone: string | null
          phone_encrypted: string | null
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          mfa_required?: boolean | null
          phone?: string | null
          phone_encrypted?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          mfa_required?: boolean | null
          phone?: string | null
          phone_encrypted?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      profiles_backup: {
        Row: {
          address: Json | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          display_name: string | null
          gender: string | null
          id: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: Database["public"]["Enums"]["rate_limit_action"]
          attempt_count: number
          blocked_until: string | null
          created_at: string
          first_attempt_at: string
          id: string
          ip_address: string
          last_attempt_at: string
          user_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["rate_limit_action"]
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          first_attempt_at?: string
          id?: string
          ip_address: string
          last_attempt_at?: string
          user_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["rate_limit_action"]
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          first_attempt_at?: string
          id?: string
          ip_address?: string
          last_attempt_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      report_alerts: {
        Row: {
          alert_type: string
          barber_id: string | null
          barbershop_id: string
          created_at: string
          current_value: number | null
          id: string
          is_read: boolean
          last_triggered_at: string
          message: string | null
          threshold: number
        }
        Insert: {
          alert_type: string
          barber_id?: string | null
          barbershop_id: string
          created_at?: string
          current_value?: number | null
          id?: string
          is_read?: boolean
          last_triggered_at?: string
          message?: string | null
          threshold?: number
        }
        Update: {
          alert_type?: string
          barber_id?: string | null
          barbershop_id?: string
          created_at?: string
          current_value?: number | null
          id?: string
          is_read?: boolean
          last_triggered_at?: string
          message?: string | null
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_alerts_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_alerts_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          barbershop_id: string
          client_id: string
          comment: string | null
          created_at: string
          deleted_at: string | null
          id: string
          rating: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          client_id: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          rating: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      services: {
        Row: {
          barbershop_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          duration: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          barbershop_id: string
          benefits: Json | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          plan_name: string
          price_monthly: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          benefits?: Json | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          plan_name: string
          price_monthly: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          benefits?: Json | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          plan_name?: string
          price_monthly?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          barbershop_id: string
          created_at: string
          end_date: string
          id: string
          plan_type: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          end_date: string
          id?: string
          plan_type?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          end_date?: string
          id?: string
          plan_type?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          barbershop_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      recent_errors: {
        Row: {
          barbershop_id: string | null
          context: Json | null
          created_at: string | null
          error_stack: string | null
          id: string | null
          level: string | null
          message: string | null
          method: string | null
          service: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          barbershop_id?: string | null
          context?: Json | null
          created_at?: string | null
          error_stack?: string | null
          id?: string | null
          level?: string | null
          message?: string | null
          method?: string | null
          service?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string | null
          context?: Json | null
          created_at?: string | null
          error_stack?: string | null
          id?: string | null
          level?: string | null
          message?: string | null
          method?: string | null
          service?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "app_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_mfa_status"
            referencedColumns: ["user_id"]
          },
        ]
      }
      slow_operations: {
        Row: {
          context: Json | null
          created_at: string | null
          duration_ms: number | null
          id: string | null
          message: string | null
          method: string | null
          service: string | null
        }
        Relationships: []
      }
      vw_mfa_status: {
        Row: {
          barbershop_id: string | null
          barbershop_name: string | null
          display_name: string | null
          has_mfa_configured: boolean | null
          mfa_required: boolean | null
          mfa_status: string | null
          role_display: string | null
          user_id: string | null
          user_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acquire_booking_slot_lock: {
        Args: { p_barber_id: string; p_booking_date: string }
        Returns: undefined
      }
      block_ip: {
        Args: {
          p_duration_hours?: number
          p_ip_address: string
          p_permanent?: boolean
          p_reason?: string
        }
        Returns: string
      }
      calculate_booking_end_time: {
        Args: { p_duration_minutes: number; p_start_time: string }
        Returns: string
      }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      can_manage_booking: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      check_and_trigger_alerts: { Args: never; Returns: number }
      check_mfa_rate_limit: { Args: { p_user_id: string }; Returns: Json }
      check_mfa_requirement: { Args: { p_user_id: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          p_action_type: Database["public"]["Enums"]["rate_limit_action"]
          p_ip_address: string
          p_max_attempts?: number
          p_user_id?: string
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          blocked_until: string
          current_count: number
          remaining_attempts: number
          reset_at: string
        }[]
      }
      check_subscription_status: {
        Args: { barbershop_uuid: string }
        Returns: {
          days_remaining: number
          is_active: boolean
          plan_type: string
        }[]
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      client_can_cancel_booking: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      current_user_verified: {
        Args: never
        Returns: {
          email: string
          email_confirmed: boolean
          email_confirmed_at: string
          user_id: string
        }[]
      }
      debug_slots: {
        Args: { p_barber_id: string; p_date: string; p_duration: number }
        Returns: {
          info: string
          valor: string
        }[]
      }
      decrypt_phone: { Args: { encrypted_phone: string }; Returns: string }
      decrypt_sensitive: { Args: { encrypted_data: string }; Returns: string }
      encrypt_sensitive: { Args: { data: string }; Returns: string }
      generate_slug: { Args: { input_name: string }; Returns: string }
      get_active_alerts: {
        Args: never
        Returns: {
          alert_type: string
          created_at: string
          current_value: number
          id: string
          is_read: boolean
          message: string
          threshold: number
        }[]
      }
      get_all_tables_info: {
        Args: never
        Returns: {
          has_rls: boolean
          row_count: number
          table_name: string
        }[]
      }
      get_audit_timeline: {
        Args: {
          p_booking_id?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          action: string
          actor_role: string
          barber_name: string
          booking_id: string
          client_name: string
          created_at: string
          new_status: string
          old_status: string
          origin: string
        }[]
      }
      get_available_slots: {
        Args: { p_barber_id: string; p_date: string; p_duration?: number }
        Returns: {
          is_available: boolean
          slot_time: string
        }[]
      }
      get_barber_advanced_metrics: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          average_service_duration_minutes: number
          average_ticket: number
          busiest_time_slot: string
          busiest_time_slot_count: number
          busiest_weekday: number
          busiest_weekday_count: number
          cancellation_rate_percent: number
          most_used_service_count: number
          most_used_service_id: string
          most_used_service_name: string
          no_show_rate_percent: number
          total_bookings_completed: number
          total_cancelled: number
          total_no_show: number
          total_revenue: number
        }[]
      }
      get_barber_performance_report: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          barber_id: string
          barber_name: string
          total_bookings: number
          total_revenue: number
        }[]
      }
      get_barbershop_cities: {
        Args: never
        Returns: {
          barbershop_count: number
          city: string
          state: string
        }[]
      }
      get_barbershop_favorites_count: {
        Args: { p_barbershop_id: string }
        Returns: number
      }
      get_bookings_report: {
        Args: {
          p_barber_filter?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          booking_date: string
          total_bookings: number
        }[]
      }
      get_cancellation_noshow_report: {
        Args: {
          p_barber_filter?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          cancellation_rate: number
          cancelled_bookings: number
          completed_bookings: number
          noshow_bookings: number
          noshow_rate: number
          total_bookings: number
        }[]
      }
      get_client_display_name: {
        Args: { p_client_id: string }
        Returns: string
      }
      get_database_functions_info: {
        Args: never
        Returns: {
          argument_types: string
          function_name: string
          function_type: string
          return_type: string
        }[]
      }
      get_decrypted_phone: {
        Args: { profile_user_id: string }
        Returns: string
      }
      get_encryption_key: { Args: never; Returns: string }
      get_exportable_report_data: {
        Args: {
          p_end_date: string
          p_report_type: string
          p_start_date: string
        }
        Returns: Json
      }
      get_foreign_keys_info: {
        Args: never
        Returns: {
          column_name: string
          constraint_name: string
          foreign_column: string
          foreign_table: string
          table_name: string
        }[]
      }
      get_indexes_info: {
        Args: never
        Returns: {
          indexdef: string
          indexname: string
          schemaname: string
          tablename: string
        }[]
      }
      get_monthly_comparison_report: {
        Args: {
          p_barber_filter?: string
          p_current_end_date: string
          p_current_start_date: string
          p_previous_end_date: string
          p_previous_start_date: string
        }
        Returns: {
          avg_ticket_variation: number
          bookings_variation: number
          current_avg_ticket: number
          current_bookings: number
          current_revenue: number
          previous_avg_ticket: number
          previous_bookings: number
          previous_revenue: number
          revenue_variation: number
        }[]
      }
      get_revenue_report: {
        Args: {
          p_barber_filter?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          average_ticket: number
          total_bookings: number
          total_revenue: number
        }[]
      }
      get_rls_policies_info: {
        Args: never
        Returns: {
          cmd: string
          permissive: string
          policyname: string
          qual: string
          roles: string[]
          schemaname: string
          tablename: string
          with_check: string
        }[]
      }
      get_schedule_occupancy_report: {
        Args: {
          p_barber_filter?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          available_hours: number
          barber_id: string
          barber_name: string
          occupancy_rate: number
          occupied_hours: number
        }[]
      }
      get_tables_schema_info: {
        Args: never
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: boolean
          table_name: string
        }[]
      }
      get_tables_without_rls: {
        Args: never
        Returns: {
          has_rls: boolean
          table_name: string
        }[]
      }
      get_top_clients_and_profitable_hours: {
        Args: { p_end_date: string; p_limit?: number; p_start_date: string }
        Returns: {
          client_id: string
          client_name: string
          profitable_time_slot: string
          profitable_time_slot_revenue: number
          profitable_weekday: number
          profitable_weekday_revenue: number
          total_bookings: number
          total_revenue: number
        }[]
      }
      get_top_services_report: {
        Args: {
          p_barber_filter?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          service_id: string
          service_name: string
          total_bookings: number
          total_revenue: number
        }[]
      }
      get_triggers_info: {
        Args: never
        Returns: {
          action_statement: string
          action_timing: string
          event_manipulation: string
          event_object_schema: string
          event_object_table: string
          trigger_name: string
        }[]
      }
      get_user_role: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _barbershop_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_app_log: {
        Args: {
          p_barbershop_id?: string
          p_context?: Json
          p_duration_ms?: number
          p_error_stack?: string
          p_level: string
          p_message: string
          p_method: string
          p_service: string
          p_url?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      is_admin_with_mfa: { Args: never; Returns: boolean }
      is_barber_at_barbershop: {
        Args: { p_barbershop_id: string; p_user_id: string }
        Returns: boolean
      }
      is_barbershop_owner: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_barbershop_staff: {
        Args: { p_barbershop_id: string; p_user_id: string }
        Returns: boolean
      }
      is_booking_barber: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      is_email_verified: { Args: never; Returns: boolean }
      is_user_in_grace_period: { Args: never; Returns: boolean }
      log_mfa_attempt: {
        Args: {
          p_attempt_type: string
          p_ip_address?: string
          p_success: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      reset_rate_limit: {
        Args: {
          p_action_type: Database["public"]["Enums"]["rate_limit_action"]
          p_ip_address: string
        }
        Returns: undefined
      }
      sanitize_input: { Args: { input_text: string }; Returns: string }
      save_recovery_codes: {
        Args: { p_codes: string[]; p_user_id: string }
        Returns: Json
      }
      search_barbershops_by_proximity: {
        Args: { max_distance_km?: number; user_lat: number; user_lon: number }
        Returns: {
          address: string
          city: string
          distance_km: number
          id: string
          image_url: string
          latitude: number
          longitude: number
          name: string
          rating: number
          state: string
          total_reviews: number
        }[]
      }
      user_has_role_at: {
        Args: { p_barbershop_id: string; p_user_id: string }
        Returns: boolean
      }
      user_is_owner_of: {
        Args: { p_barbershop_id: string; p_user_id: string }
        Returns: boolean
      }
      user_owns_barbershop: { Args: { p_user_id: string }; Returns: string }
      verify_recovery_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "owner" | "barber" | "attendant"
      rate_limit_action:
        | "login"
        | "signup"
        | "booking_create"
        | "slots_query"
        | "password_reset"
        | "api_call"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "barber", "attendant"],
      rate_limit_action: [
        "login",
        "signup",
        "booking_create",
        "slots_query",
        "password_reset",
        "api_call",
      ],
    },
  },
} as const
