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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      ai_assist_log: {
        Row: {
          answer: string | null
          citations: Json | null
          confidence: number | null
          created_at: string | null
          created_by: string | null
          findings: Json | null
          id: string
          mode: string
          page_key: string
          prompt: string | null
        }
        Insert: {
          answer?: string | null
          citations?: Json | null
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          findings?: Json | null
          id?: string
          mode: string
          page_key: string
          prompt?: string | null
        }
        Update: {
          answer?: string | null
          citations?: Json | null
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          findings?: Json | null
          id?: string
          mode?: string
          page_key?: string
          prompt?: string | null
        }
        Relationships: []
      }
      ai_command_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          body: string | null
          category: string
          created_at: string
          expires_at: string | null
          id: string
          severity: string
          source: string | null
          title: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string | null
          category: string
          created_at?: string
          expires_at?: string | null
          id?: string
          severity: string
          source?: string | null
          title: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          body?: string | null
          category?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          severity?: string
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      ai_explanations_cache: {
        Row: {
          answer: string
          created_at: string
          data_summary: string | null
          expires_at: string
          hash: string
          question: string
        }
        Insert: {
          answer: string
          created_at?: string
          data_summary?: string | null
          expires_at?: string
          hash: string
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          data_summary?: string | null
          expires_at?: string
          hash?: string
          question?: string
        }
        Relationships: []
      }
      ai_memory_conversations: {
        Row: {
          id: string
          last_active_at: string
          metadata: Json
          route: string
          started_at: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          last_active_at?: string
          metadata?: Json
          route: string
          started_at?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          last_active_at?: string
          metadata?: Json
          route?: string
          started_at?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_memory_facts: {
        Row: {
          created_at: string
          expires_at: string | null
          fact: string
          id: string
          scope: string
          source: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          fact: string
          id?: string
          scope?: string
          source?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          fact?: string
          id?: string
          scope?: string
          source?: string | null
          weight?: number
        }
        Relationships: []
      }
      ai_memory_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens_in: number | null
          tokens_out: number | null
          tool_calls: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens_in?: number | null
          tokens_out?: number | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_memory_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_recommendations: {
        Row: {
          created_at: string
          id: string
          measured_lift: number | null
          module: string
          outcome: string | null
          payload: Json
          rationale: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          measured_lift?: number | null
          module: string
          outcome?: string | null
          payload?: Json
          rationale?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          measured_lift?: number | null
          module?: string
          outcome?: string | null
          payload?: Json
          rationale?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      analytics_ai_insights: {
        Row: {
          answer: string | null
          created_at: string
          created_by: string | null
          data_refs: Json | null
          id: string
          prompt: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          created_by?: string | null
          data_refs?: Json | null
          id?: string
          prompt: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          created_by?: string | null
          data_refs?: Json | null
          id?: string
          prompt?: string
        }
        Relationships: []
      }
      analytics_alerts: {
        Row: {
          confidence: number
          created_at: string
          evidence: Json
          id: string
          impact: string | null
          kind: string
          severity: string
          status: string
          suggestion: string | null
          title: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          evidence?: Json
          id?: string
          impact?: string | null
          kind: string
          severity: string
          status?: string
          suggestion?: string | null
          title: string
        }
        Update: {
          confidence?: number
          created_at?: string
          evidence?: Json
          id?: string
          impact?: string | null
          kind?: string
          severity?: string
          status?: string
          suggestion?: string | null
          title?: string
        }
        Relationships: []
      }
      analytics_daily_metrics: {
        Row: {
          day: string
          dims: Json
          dims_hash: string
          metric: string
          updated_at: string
          value: number
        }
        Insert: {
          day: string
          dims?: Json
          dims_hash?: string
          metric: string
          updated_at?: string
          value?: number
        }
        Update: {
          day?: string
          dims?: Json
          dims_hash?: string
          metric?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: number
          props: Json
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          props?: Json
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          props?: Json
        }
        Relationships: []
      }
      analytics_feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      analytics_jobs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          job: string
          started_at: string | null
          status: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          job: string
          started_at?: string | null
          status: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          job?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      analytics_monthly_metrics: {
        Row: {
          day: string
          dims: Json
          dims_hash: string
          metric: string
          updated_at: string
          value: number
        }
        Insert: {
          day: string
          dims?: Json
          dims_hash?: string
          metric: string
          updated_at?: string
          value?: number
        }
        Update: {
          day?: string
          dims?: Json
          dims_hash?: string
          metric?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      analytics_predictions: {
        Row: {
          created_at: string
          horizon_days: number
          id: string
          metric: string
          model: string | null
          points: Json
        }
        Insert: {
          created_at?: string
          horizon_days: number
          id?: string
          metric: string
          model?: string | null
          points: Json
        }
        Update: {
          created_at?: string
          horizon_days?: number
          id?: string
          metric?: string
          model?: string | null
          points?: Json
        }
        Relationships: []
      }
      analytics_recommendations: {
        Row: {
          body: string | null
          category: string
          confidence: number
          created_at: string
          id: string
          status: string
          title: string
        }
        Insert: {
          body?: string | null
          category: string
          confidence?: number
          created_at?: string
          id?: string
          status?: string
          title: string
        }
        Update: {
          body?: string | null
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      analytics_reports: {
        Row: {
          created_at: string
          id: string
          period: string
          period_end: string
          period_start: string
          summary: Json
        }
        Insert: {
          created_at?: string
          id?: string
          period: string
          period_end: string
          period_start: string
          summary?: Json
        }
        Update: {
          created_at?: string
          id?: string
          period?: string
          period_end?: string
          period_start?: string
          summary?: Json
        }
        Relationships: []
      }
      analytics_weekly_metrics: {
        Row: {
          day: string
          dims: Json
          dims_hash: string
          metric: string
          updated_at: string
          value: number
        }
        Insert: {
          day: string
          dims?: Json
          dims_hash?: string
          metric: string
          updated_at?: string
          value?: number
        }
        Update: {
          day?: string
          dims?: Json
          dims_hash?: string
          metric?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      app_update_config: {
        Row: {
          app: string
          created_at: string
          id: string
          latest_version: string
          minimum_supported_version: string
          platform: string
          store_url: string
          updated_at: string
        }
        Insert: {
          app: string
          created_at?: string
          id?: string
          latest_version: string
          minimum_supported_version: string
          platform: string
          store_url: string
          updated_at?: string
        }
        Update: {
          app?: string
          created_at?: string
          id?: string
          latest_version?: string
          minimum_supported_version?: string
          platform?: string
          store_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      availability: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          is_available: boolean | null
          provider_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          is_available?: boolean | null
          provider_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_available?: boolean | null
          provider_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_trigger_audit: {
        Row: {
          action: string
          created_at: string
          function_name: string | null
          id: number
          trigger_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          function_name?: string | null
          id?: number
          trigger_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          function_name?: string | null
          id?: number
          trigger_name?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          attendance_confirmed_at: string | null
          booking_date: string
          booking_time: string
          booking_time_text: string | null
          business_user_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_role: Database["public"]["Enums"]["user_role"] | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          customer_id: string
          customer_location: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          discount_amount: number | null
          id: string
          notes: string | null
          price: number | null
          provider_attendance_outcome: string | null
          provider_id: string
          service_id: string
          service_name: string | null
          service_price: number
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          attendance_confirmed_at?: string | null
          booking_date: string
          booking_time: string
          booking_time_text?: string | null
          business_user_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_role?: Database["public"]["Enums"]["user_role"] | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_id: string
          customer_location?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          discount_amount?: number | null
          id?: string
          notes?: string | null
          price?: number | null
          provider_attendance_outcome?: string | null
          provider_id: string
          service_id: string
          service_name?: string | null
          service_price: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          attendance_confirmed_at?: string | null
          booking_date?: string
          booking_time?: string
          booking_time_text?: string | null
          business_user_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_role?: Database["public"]["Enums"]["user_role"] | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          customer_id?: string
          customer_location?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          discount_amount?: number | null
          id?: string
          notes?: string | null
          price?: number | null
          provider_attendance_outcome?: string | null
          provider_id?: string
          service_id?: string
          service_name?: string | null
          service_price?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
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
      business_health_score: {
        Row: {
          computed_at: string
          departments: Json
          factors: Json
          id: string
          overall: number
          risk_level: string
          suggestions: Json
          trend: number | null
        }
        Insert: {
          computed_at?: string
          departments?: Json
          factors?: Json
          id?: string
          overall: number
          risk_level?: string
          suggestions?: Json
          trend?: number | null
        }
        Update: {
          computed_at?: string
          departments?: Json
          factors?: Json
          id?: string
          overall?: number
          risk_level?: string
          suggestions?: Json
          trend?: number | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          customer_user_id: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          last_message_sender_id: string | null
          provider_id: string
          provider_user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          customer_user_id: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_sender_id?: string | null
          provider_id: string
          provider_user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          customer_user_id?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          last_message_sender_id?: string | null
          provider_id?: string
          provider_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          client_id: string | null
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          media_duration: number | null
          media_url: string | null
          message_type: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          client_id?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_duration?: number | null
          media_url?: string | null
          message_type?: string
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          client_id?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_duration?: number | null
          media_url?: string | null
          message_type?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_typing: {
        Row: {
          conversation_id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_typing_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          business_user_id: string
          created_at: string
          email: string | null
          id: string
          last_booking_date: string | null
          name: string
          phone: string | null
          total_bookings: number | null
          updated_at: string
        }
        Insert: {
          business_user_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_booking_date?: string | null
          name: string
          phone?: string | null
          total_bookings?: number | null
          updated_at?: string
        }
        Update: {
          business_user_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_booking_date?: string | null
          name?: string
          phone?: string | null
          total_bookings?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      copilot_audit_events: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      copilot_business_leads: {
        Row: {
          address: string | null
          already_uses_bookme: boolean | null
          app_installed_status: string | null
          business_name: string
          category_id: string | null
          contact_permission: boolean | null
          contact_person: string | null
          contact_role: string | null
          created_at: string | null
          email: string | null
          feedback: string | null
          follow_up_date: string | null
          id: string
          interest_level: string | null
          landmark: string | null
          lga: string | null
          linked_business_id: string | null
          next_action: string | null
          onboarding_status: string | null
          operating_model: string | null
          phone: string | null
          photo_url: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          services_offered: string | null
          state: string | null
          submission_id: string
          submitting_agent_id: string | null
          town: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          already_uses_bookme?: boolean | null
          app_installed_status?: string | null
          business_name: string
          category_id?: string | null
          contact_permission?: boolean | null
          contact_person?: string | null
          contact_role?: string | null
          created_at?: string | null
          email?: string | null
          feedback?: string | null
          follow_up_date?: string | null
          id?: string
          interest_level?: string | null
          landmark?: string | null
          lga?: string | null
          linked_business_id?: string | null
          next_action?: string | null
          onboarding_status?: string | null
          operating_model?: string | null
          phone?: string | null
          photo_url?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_offered?: string | null
          state?: string | null
          submission_id: string
          submitting_agent_id?: string | null
          town?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          already_uses_bookme?: boolean | null
          app_installed_status?: string | null
          business_name?: string
          category_id?: string | null
          contact_permission?: boolean | null
          contact_person?: string | null
          contact_role?: string | null
          created_at?: string | null
          email?: string | null
          feedback?: string | null
          follow_up_date?: string | null
          id?: string
          interest_level?: string | null
          landmark?: string | null
          lga?: string | null
          linked_business_id?: string | null
          next_action?: string | null
          onboarding_status?: string | null
          operating_model?: string | null
          phone?: string | null
          photo_url?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_offered?: string | null
          state?: string | null
          submission_id?: string
          submitting_agent_id?: string | null
          town?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_business_leads_linked_business_id_fkey"
            columns: ["linked_business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_business_leads_linked_business_id_fkey"
            columns: ["linked_business_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_customer_leads: {
        Row: {
          already_uses_bookme: boolean | null
          app_installed_status: string | null
          assistance_required: string | null
          booking_experience_barriers: string | null
          contact_permission: boolean | null
          created_at: string | null
          email: string | null
          feedback: string | null
          follow_up_date: string | null
          id: string
          is_anonymous: boolean | null
          linked_customer_id: string | null
          location: string | null
          next_action: string | null
          phone: string | null
          preferred_name: string | null
          registration_status: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          services_of_interest: string | null
          submission_id: string
          submitting_agent_id: string | null
          updated_at: string | null
        }
        Insert: {
          already_uses_bookme?: boolean | null
          app_installed_status?: string | null
          assistance_required?: string | null
          booking_experience_barriers?: string | null
          contact_permission?: boolean | null
          created_at?: string | null
          email?: string | null
          feedback?: string | null
          follow_up_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          linked_customer_id?: string | null
          location?: string | null
          next_action?: string | null
          phone?: string | null
          preferred_name?: string | null
          registration_status?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_of_interest?: string | null
          submission_id: string
          submitting_agent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          already_uses_bookme?: boolean | null
          app_installed_status?: string | null
          assistance_required?: string | null
          booking_experience_barriers?: string | null
          contact_permission?: boolean | null
          created_at?: string | null
          email?: string | null
          feedback?: string | null
          follow_up_date?: string | null
          id?: string
          is_anonymous?: boolean | null
          linked_customer_id?: string | null
          location?: string | null
          next_action?: string | null
          phone?: string | null
          preferred_name?: string | null
          registration_status?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_of_interest?: string | null
          submission_id?: string
          submitting_agent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_customer_leads_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_customer_leads_linked_customer_id_fkey"
            columns: ["linked_customer_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_follow_ups: {
        Row: {
          assigned_agent_id: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          status: string | null
          submitting_agent_id: string | null
          target_business_lead_id: string | null
          target_customer_lead_id: string | null
          target_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          status?: string | null
          submitting_agent_id?: string | null
          target_business_lead_id?: string | null
          target_customer_lead_id?: string | null
          target_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          status?: string | null
          submitting_agent_id?: string | null
          target_business_lead_id?: string | null
          target_customer_lead_id?: string | null
          target_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_follow_ups_target_business_lead_id_fkey"
            columns: ["target_business_lead_id"]
            isOneToOne: false
            referencedRelation: "copilot_business_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_follow_ups_target_customer_lead_id_fkey"
            columns: ["target_customer_lead_id"]
            isOneToOne: false
            referencedRelation: "copilot_customer_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_issues: {
        Row: {
          affected_app: string
          app_version: string | null
          category: string | null
          created_at: string | null
          description: string
          device_platform: string | null
          id: string
          severity: string | null
          status: string | null
          steps_to_reproduce: string | null
          submitting_agent_id: string | null
          target_business_lead_id: string | null
          target_customer_lead_id: string | null
          tracking_reference: string | null
        }
        Insert: {
          affected_app: string
          app_version?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          device_platform?: string | null
          id?: string
          severity?: string | null
          status?: string | null
          steps_to_reproduce?: string | null
          submitting_agent_id?: string | null
          target_business_lead_id?: string | null
          target_customer_lead_id?: string | null
          tracking_reference?: string | null
        }
        Update: {
          affected_app?: string
          app_version?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          device_platform?: string | null
          id?: string
          severity?: string | null
          status?: string | null
          steps_to_reproduce?: string | null
          submitting_agent_id?: string | null
          target_business_lead_id?: string | null
          target_customer_lead_id?: string | null
          tracking_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_issues_target_business_lead_id_fkey"
            columns: ["target_business_lead_id"]
            isOneToOne: false
            referencedRelation: "copilot_business_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_issues_target_customer_lead_id_fkey"
            columns: ["target_customer_lead_id"]
            isOneToOne: false
            referencedRelation: "copilot_customer_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_visits: {
        Row: {
          created_at: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          outcome: string | null
          submitting_agent_id: string | null
          target_business_lead_id: string | null
          target_customer_lead_id: string | null
          target_type: string
          visit_date: string | null
        }
        Insert: {
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          submitting_agent_id?: string | null
          target_business_lead_id?: string | null
          target_customer_lead_id?: string | null
          target_type: string
          visit_date?: string | null
        }
        Update: {
          created_at?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          outcome?: string | null
          submitting_agent_id?: string | null
          target_business_lead_id?: string | null
          target_customer_lead_id?: string | null
          target_type?: string
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "copilot_visits_target_business_lead_id_fkey"
            columns: ["target_business_lead_id"]
            isOneToOne: false
            referencedRelation: "copilot_business_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_visits_target_customer_lead_id_fkey"
            columns: ["target_customer_lead_id"]
            isOneToOne: false
            referencedRelation: "copilot_customer_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_points: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_points_log: {
        Row: {
          action: string
          booking_id: string | null
          created_at: string
          id: string
          points_earned: number
          profile_id: string
        }
        Insert: {
          action: string
          booking_id?: string | null
          created_at?: string
          id?: string
          points_earned: number
          profile_id: string
        }
        Update: {
          action?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          points_earned?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_points_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_points_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_link_events: {
        Row: {
          client_ts: string | null
          created_at: string
          event: string
          id: string
          link_kind: string | null
          meta: Json | null
          platform: string | null
          provider_id: string | null
          raw_url: string | null
          ref: string | null
          user_id: string | null
          utm_campaign: string | null
        }
        Insert: {
          client_ts?: string | null
          created_at?: string
          event: string
          id?: string
          link_kind?: string | null
          meta?: Json | null
          platform?: string | null
          provider_id?: string | null
          raw_url?: string | null
          ref?: string | null
          user_id?: string | null
          utm_campaign?: string | null
        }
        Update: {
          client_ts?: string | null
          created_at?: string
          event?: string
          id?: string
          link_kind?: string | null
          meta?: Json | null
          platform?: string | null
          provider_id?: string | null
          raw_url?: string | null
          ref?: string | null
          user_id?: string | null
          utm_campaign?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deep_link_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deep_link_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      deferred_link_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          provider_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          provider_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          provider_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "deferred_link_tokens_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deferred_link_tokens_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          document_number: string
          document_type: Database["public"]["Enums"]["document_type"]
          document_url: string
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["document_status"] | null
          updated_at: string
          verification_date: string | null
          verification_notes: string | null
          verified_by_admin: string | null
        }
        Insert: {
          created_at?: string
          document_number: string
          document_type: Database["public"]["Enums"]["document_type"]
          document_url: string
          id?: string
          profile_id: string
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string
          verification_date?: string | null
          verification_notes?: string | null
          verified_by_admin?: string | null
        }
        Update: {
          created_at?: string
          document_number?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          document_url?: string
          id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["document_status"] | null
          updated_at?: string
          verification_date?: string | null
          verification_notes?: string | null
          verified_by_admin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          app_type: string | null
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_type?: string | null
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_type?: string | null
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations_app_store: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          last_sync: string | null
          vendor: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync?: string | null
          vendor: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync?: string | null
          vendor?: string
        }
        Relationships: []
      }
      integrations_app_store_metrics: {
        Row: {
          day: string
          dims: Json
          metric: string
          value: number
          vendor: string
        }
        Insert: {
          day: string
          dims?: Json
          metric: string
          value?: number
          vendor: string
        }
        Update: {
          day?: string
          dims?: Json
          metric?: string
          value?: number
          vendor?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          related_booking_id: string | null
          related_provider_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          type_enum: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          related_booking_id?: string | null
          related_provider_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          type_enum?: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          related_booking_id?: string | null
          related_provider_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          type_enum?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_provider_id_fkey"
            columns: ["related_provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_provider_id_fkey"
            columns: ["related_provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_auth_deletions: {
        Row: {
          attempts: number
          auth_user_id: string
          email: string | null
          first_failed_at: string
          id: string
          last_attempt_at: string
          last_error: string | null
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          attempts?: number
          auth_user_id: string
          email?: string | null
          first_failed_at?: string
          id?: string
          last_attempt_at?: string
          last_error?: string | null
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          attempts?: number
          auth_user_id?: string
          email?: string | null
          first_failed_at?: string
          id?: string
          last_attempt_at?: string
          last_error?: string | null
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          business_description: string | null
          business_hours: Json | null
          business_logo_url: string | null
          business_name: string | null
          business_registration_number: string | null
          category: string | null
          city: string | null
          completed_bookings_count: number
          copilot_role: string | null
          cover_image_url: string | null
          cover_photo_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          fcm_token: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_promoted: boolean | null
          is_verified: boolean | null
          last_login_at: string | null
          latitude: number | null
          longitude: number | null
          notification_preferences: Json | null
          owner_name: string | null
          phone: string | null
          postal_code: string | null
          promo_campaign_slug: string | null
          promo_claimed: boolean
          promo_slot_number: number | null
          promo_trial_end_at: string | null
          promo_trial_start_at: string | null
          rating: number | null
          referral_source: string | null
          review_count: number | null
          role: Database["public"]["Enums"]["user_role"]
          slug: string | null
          social_links: Json | null
          state: string | null
          subcategories: string[] | null
          tax_id: string | null
          total_bookings: number | null
          updated_at: string
          user_id: string
          username: string | null
          verification_date: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          business_description?: string | null
          business_hours?: Json | null
          business_logo_url?: string | null
          business_name?: string | null
          business_registration_number?: string | null
          category?: string | null
          city?: string | null
          completed_bookings_count?: number
          copilot_role?: string | null
          cover_image_url?: string | null
          cover_photo_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          fcm_token?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_promoted?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          latitude?: number | null
          longitude?: number | null
          notification_preferences?: Json | null
          owner_name?: string | null
          phone?: string | null
          postal_code?: string | null
          promo_campaign_slug?: string | null
          promo_claimed?: boolean
          promo_slot_number?: number | null
          promo_trial_end_at?: string | null
          promo_trial_start_at?: string | null
          rating?: number | null
          referral_source?: string | null
          review_count?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          slug?: string | null
          social_links?: Json | null
          state?: string | null
          subcategories?: string[] | null
          tax_id?: string | null
          total_bookings?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          verification_date?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          business_description?: string | null
          business_hours?: Json | null
          business_logo_url?: string | null
          business_name?: string | null
          business_registration_number?: string | null
          category?: string | null
          city?: string | null
          completed_bookings_count?: number
          copilot_role?: string | null
          cover_image_url?: string | null
          cover_photo_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          fcm_token?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_promoted?: boolean | null
          is_verified?: boolean | null
          last_login_at?: string | null
          latitude?: number | null
          longitude?: number | null
          notification_preferences?: Json | null
          owner_name?: string | null
          phone?: string | null
          postal_code?: string | null
          promo_campaign_slug?: string | null
          promo_claimed?: boolean
          promo_slot_number?: number | null
          promo_trial_end_at?: string | null
          promo_trial_start_at?: string | null
          rating?: number | null
          referral_source?: string | null
          review_count?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          slug?: string | null
          social_links?: Json | null
          state?: string | null
          subcategories?: string[] | null
          tax_id?: string | null
          total_bookings?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verification_date?: string | null
          website?: string | null
        }
        Relationships: []
      }
      promo_campaigns: {
        Row: {
          claims_count: number
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          max_claims: number
          name: string
          slug: string
          starts_at: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          claims_count?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_claims?: number
          name: string
          slug: string
          starts_at?: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          claims_count?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_claims?: number
          name?: string
          slug?: string
          starts_at?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      promo_claims: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          profile_id: string
          slot_number: number
          trial_end_at: string
          trial_start_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          profile_id: string
          slot_number: number
          trial_end_at: string
          trial_start_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          slot_number?: number
          trial_end_at?: string
          trial_start_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_claims_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "promo_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_claims_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_claims_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          provider_id: string
          service_id: string | null
          start_date: string
          title: string
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          provider_id: string
          service_id?: string | null
          start_date?: string
          title: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          provider_id?: string
          service_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          client_id: string | null
          comment: string | null
          created_at: string
          customer_avatar: string | null
          customer_id: string
          customer_name: string | null
          id: string
          provider_id: string
          rating: number
          service_name: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          client_id?: string | null
          comment?: string | null
          created_at?: string
          customer_avatar?: string | null
          customer_id: string
          customer_name?: string | null
          id?: string
          provider_id: string
          rating: number
          service_name?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          client_id?: string | null
          comment?: string | null
          created_at?: string
          customer_avatar?: string | null
          customer_id?: string
          customer_name?: string | null
          id?: string
          provider_id?: string
          rating?: number
          service_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_providers: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          currency: string | null
          delivery_modes: Database["public"]["Enums"]["delivery_mode"][] | null
          description: string | null
          duration: string
          duration_minutes: number
          emoji: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_locked: boolean | null
          locked_key: string | null
          max_price: number | null
          name: string
          price: number
          pricing_type: string | null
          provider_id: string
          sort_order: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          currency?: string | null
          delivery_modes?: Database["public"]["Enums"]["delivery_mode"][] | null
          description?: string | null
          duration?: string
          duration_minutes?: number
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_locked?: boolean | null
          locked_key?: string | null
          max_price?: number | null
          name: string
          price: number
          pricing_type?: string | null
          provider_id: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string | null
          delivery_modes?: Database["public"]["Enums"]["delivery_mode"][] | null
          description?: string | null
          duration?: string
          duration_minutes?: number
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_locked?: boolean | null
          locked_key?: string | null
          max_price?: number | null
          name?: string
          price?: number
          pricing_type?: string | null
          provider_id?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      store_analytics_audit_events: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      store_analytics_metrics: {
        Row: {
          acquisition_source: string
          app_version: string
          country: string
          device_category: string
          granularity: string
          id: string
          imported_at: string
          metric_date: string
          metric_name: string
          metric_value: number
          os_version: string
          source_freshness_date: string | null
          source_report_type: string
          store_application_id: string
          sync_job_reference: string | null
        }
        Insert: {
          acquisition_source?: string
          app_version?: string
          country?: string
          device_category?: string
          granularity?: string
          id?: string
          imported_at?: string
          metric_date: string
          metric_name: string
          metric_value: number
          os_version?: string
          source_freshness_date?: string | null
          source_report_type?: string
          store_application_id: string
          sync_job_reference?: string | null
        }
        Update: {
          acquisition_source?: string
          app_version?: string
          country?: string
          device_category?: string
          granularity?: string
          id?: string
          imported_at?: string
          metric_date?: string
          metric_name?: string
          metric_value?: number
          os_version?: string
          source_freshness_date?: string | null
          source_report_type?: string
          store_application_id?: string
          sync_job_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_analytics_metrics_store_application_id_fkey"
            columns: ["store_application_id"]
            isOneToOne: false
            referencedRelation: "store_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      store_applications: {
        Row: {
          app_id: string
          app_type: string
          created_at: string
          id: string
          name: string
          platform: string
          updated_at: string
        }
        Insert: {
          app_id: string
          app_type: string
          created_at?: string
          id?: string
          name: string
          platform: string
          updated_at?: string
        }
        Update: {
          app_id?: string
          app_type?: string
          created_at?: string
          id?: string
          name?: string
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_connection_status: {
        Row: {
          is_configured: boolean
          last_attempted_at: string | null
          last_error_message: string | null
          last_successful_at: string | null
          platform: string
          updated_at: string
        }
        Insert: {
          is_configured?: boolean
          last_attempted_at?: string | null
          last_error_message?: string | null
          last_successful_at?: string | null
          platform: string
          updated_at?: string
        }
        Update: {
          is_configured?: boolean
          last_attempted_at?: string | null
          last_error_message?: string | null
          last_successful_at?: string | null
          platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_raw_report_manifests: {
        Row: {
          id: string
          imported_at: string
          report_date: string
          report_name: string
          store_application_id: string
        }
        Insert: {
          id?: string
          imported_at?: string
          report_date: string
          report_name: string
          store_application_id: string
        }
        Update: {
          id?: string
          imported_at?: string
          report_date?: string
          report_name?: string
          store_application_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_raw_report_manifests_store_application_id_fkey"
            columns: ["store_application_id"]
            isOneToOne: false
            referencedRelation: "store_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reviews: {
        Row: {
          app_version: string | null
          author_name: string | null
          created_at: string
          developer_response_status: string | null
          id: string
          imported_at: string
          language: string | null
          rating: number
          review_id: string
          review_text: string | null
          store_application_id: string
          title: string | null
        }
        Insert: {
          app_version?: string | null
          author_name?: string | null
          created_at: string
          developer_response_status?: string | null
          id?: string
          imported_at?: string
          language?: string | null
          rating: number
          review_id: string
          review_text?: string | null
          store_application_id: string
          title?: string | null
        }
        Update: {
          app_version?: string | null
          author_name?: string | null
          created_at?: string
          developer_response_status?: string | null
          id?: string
          imported_at?: string
          language?: string | null
          rating?: number
          review_id?: string
          review_text?: string | null
          store_application_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_store_application_id_fkey"
            columns: ["store_application_id"]
            isOneToOne: false
            referencedRelation: "store_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      store_sync_errors: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string
          id: string
          store_application_id: string | null
          sync_job_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message: string
          id?: string
          store_application_id?: string | null
          sync_job_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string
          id?: string
          store_application_id?: string | null
          sync_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_sync_errors_store_application_id_fkey"
            columns: ["store_application_id"]
            isOneToOne: false
            referencedRelation: "store_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sync_errors_sync_job_id_fkey"
            columns: ["sync_job_id"]
            isOneToOne: false
            referencedRelation: "store_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      store_sync_jobs: {
        Row: {
          completed_at: string | null
          id: string
          records_imported: number | null
          started_at: string
          status: string
          store_application_id: string
          target_date_end: string | null
          target_date_start: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          records_imported?: number | null
          started_at?: string
          status: string
          store_application_id: string
          target_date_end?: string | null
          target_date_start?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          records_imported?: number | null
          started_at?: string
          status?: string
          store_application_id?: string
          target_date_end?: string | null
          target_date_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_sync_jobs_store_application_id_fkey"
            columns: ["store_application_id"]
            isOneToOne: false
            referencedRelation: "store_applications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_bookings: {
        Row: {
          booking_date: string | null
          booking_time: string | null
          business_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_role: Database["public"]["Enums"]["user_role"] | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_id: string | null
          customer_location: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null
          discount_amount: number | null
          id: string | null
          listed_service_price: number | null
          notes: string | null
          provider_email: string | null
          provider_id: string | null
          provider_name: string | null
          provider_phone: string | null
          service_id: string | null
          service_name: string | null
          service_price: number | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_with_stats"
            referencedColumns: ["id"]
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
      active_business_sessions: {
        Row: {
          business_name: string | null
          email: string | null
          fcm_token_last_updated: string | null
          has_fcm_token: boolean | null
          hours_until_expiry: number | null
          is_active: boolean | null
          platform: string | null
          session_created: string | null
          session_expires_at: string | null
          session_last_refreshed: string | null
          session_status: string | null
        }
        Relationships: []
      }
      deep_link_funnel: {
        Row: {
          day: string | null
          event: string | null
          link_kind: string | null
          platform: string | null
          total: number | null
          unique_providers: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      provider_fcm_status: {
        Row: {
          business_name: string | null
          email: string | null
          fcm_token: string | null
          is_active: boolean | null
          platform: string | null
          token_registered_at: string | null
          token_status: string | null
        }
        Relationships: []
      }
      providers_with_stats: {
        Row: {
          address: string | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          business_description: string | null
          business_hours: Json | null
          business_logo_url: string | null
          business_name: string | null
          business_registration_number: string | null
          category: string | null
          city: string | null
          completed_bookings: number | null
          cover_image_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          fcm_token: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          last_login_at: string | null
          latitude: number | null
          longitude: number | null
          notification_preferences: Json | null
          owner_name: string | null
          phone: string | null
          postal_code: string | null
          review_count: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          service_count: number | null
          social_links: Json | null
          state: string | null
          subcategories: string[] | null
          tax_id: string | null
          total_bookings: number | null
          updated_at: string | null
          user_id: string | null
          verification_date: string | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_complete_past_bookings: { Args: never; Returns: undefined }
      bookme_auto_complete_past_bookings: { Args: never; Returns: number }
      can_manage_staff_access: { Args: { p_user_id: string }; Returns: boolean }
      claim_new_business_promo: {
        Args: { p_campaign_slug: string; p_profile_id: string }
        Returns: {
          already_claimed: boolean
          eligible: boolean
          max_claims: number
          reason: string
          slot_number: number
          trial_end_at: string
          trial_start_at: string
        }[]
      }
      confirm_booking_attendance: {
        Args: { p_booking_id: string; p_outcome: string }
        Returns: undefined
      }
      delete_account_data: {
        Args: { p_user_id: string }
        Returns: {
          deleted_profile_id: string
          was_provider: boolean
        }[]
      }
      fn_invoke_send_notification: {
        Args: {
          _booking_id?: string
          _message: string
          _recipient_profile_id: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      get_copilot_role: { Args: { p_user_id: string }; Returns: string }
      get_fcm_tokens: {
        Args: { user_input: string }
        Returns: {
          platform: string
          token: string
        }[]
      }
      get_fcm_tokens_for_profile: {
        Args: { p_profile_id: string }
        Returns: {
          platform: string
          token: string
        }[]
      }
      grant_copilot_access: {
        Args: { p_new_copilot_role: string; p_target_user_id: string }
        Returns: Json
      }
      has_active_copilot_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_copilot_admin: { Args: never; Returns: boolean }
      is_developer: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      revoke_copilot_access: {
        Args: { p_target_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "rejected"
        | "accepted"
        | "rescheduled"
        | "no_show"
      delivery_mode: "at_shop" | "at_home" | "remote"
      document_status: "pending" | "approved" | "rejected"
      document_type:
        | "national_id"
        | "drivers_license"
        | "business_registration"
        | "tax_certificate"
      gender: "male" | "female" | "other"
      notification_type:
        | "booking_requested"
        | "booking_confirmed"
        | "booking_rejected"
        | "booking_completed"
        | "booking_cancelled"
        | "booking_reminder"
        | "message_received"
        | "review_received"
        | "promotion"
        | "system"
        | "new_booking"
        | "booking_update"
        | "new_message"
        | "booking_accepted"
        | "booking_rescheduled"
        | "new_review"
        | "info"
        | "booking_pending"
        | "booking_confirm"
        | "points_awarded"
        | "message"
      user_role:
        | "customer"
        | "provider"
        | "admin"
        | "super_admin"
        | "developer"
        | "platform_owner"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "rejected",
        "accepted",
        "rescheduled",
        "no_show",
      ],
      delivery_mode: ["at_shop", "at_home", "remote"],
      document_status: ["pending", "approved", "rejected"],
      document_type: [
        "national_id",
        "drivers_license",
        "business_registration",
        "tax_certificate",
      ],
      gender: ["male", "female", "other"],
      notification_type: [
        "booking_requested",
        "booking_confirmed",
        "booking_rejected",
        "booking_completed",
        "booking_cancelled",
        "booking_reminder",
        "message_received",
        "review_received",
        "promotion",
        "system",
        "new_booking",
        "booking_update",
        "new_message",
        "booking_accepted",
        "booking_rescheduled",
        "new_review",
        "info",
        "booking_pending",
        "booking_confirm",
        "points_awarded",
        "message",
      ],
      user_role: [
        "customer",
        "provider",
        "admin",
        "super_admin",
        "developer",
        "platform_owner",
      ],
    },
  },
} as const
