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
      ad_concepts: {
        Row: {
          angle_type: string
          approval_status: string
          batch_id: string
          clinic_id: string
          compliance_checked_at: string | null
          compliance_issues: Json
          compliance_status: string
          created_at: string
          cta: string
          description: string | null
          headline: string
          id: string
          image_urls: Json
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          meta_creative_id: string | null
          owner_feedback: string | null
          primary_text: string
          published_at: string | null
          target_audience: Json
          template_id: string | null
          visual_direction: string | null
        }
        Insert: {
          angle_type: string
          approval_status?: string
          batch_id: string
          clinic_id: string
          compliance_checked_at?: string | null
          compliance_issues?: Json
          compliance_status?: string
          created_at?: string
          cta: string
          description?: string | null
          headline: string
          id?: string
          image_urls?: Json
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          meta_creative_id?: string | null
          owner_feedback?: string | null
          primary_text: string
          published_at?: string | null
          target_audience?: Json
          template_id?: string | null
          visual_direction?: string | null
        }
        Update: {
          angle_type?: string
          approval_status?: string
          batch_id?: string
          clinic_id?: string
          compliance_checked_at?: string | null
          compliance_issues?: Json
          compliance_status?: string
          created_at?: string
          cta?: string
          description?: string | null
          headline?: string
          id?: string
          image_urls?: Json
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          meta_creative_id?: string | null
          owner_feedback?: string | null
          primary_text?: string
          published_at?: string | null
          target_audience?: Json
          template_id?: string | null
          visual_direction?: string | null
        }
      }
      ad_performance: {
        Row: {
          ad_concept_id: string
          clicks: number
          clinic_id: string
          cpc: number
          cpl: number
          ctr: number
          created_at: string
          date: string
          id: string
          impressions: number
          leads: number
          raw_insights: Json
          spend: number
        }
        Insert: {
          ad_concept_id: string
          clicks?: number
          clinic_id: string
          cpc?: number
          cpl?: number
          ctr?: number
          created_at?: string
          date: string
          id?: string
          impressions?: number
          leads?: number
          raw_insights?: Json
          spend?: number
        }
        Update: {
          ad_concept_id?: string
          clicks?: number
          clinic_id?: string
          cpc?: number
          cpl?: number
          ctr?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          leads?: number
          raw_insights?: Json
          spend?: number
        }
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          clinic_id: string | null
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor: string
          clinic_id?: string | null
          created_at?: string
          details?: Json
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          clinic_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string
          entity_type?: string
          id?: string
        }
      }
      clinics: {
        Row: {
          brand_assets: Json
          created_at: string
          doctor_info: Json
          id: string
          location: Json
          meta_access_token_encrypted: string | null
          meta_ad_account_id: string | null
          meta_token_expires_at: string | null
          name: string
          onboarding_completed: boolean
          owner_id: string
          services: string[]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          brand_assets?: Json
          created_at?: string
          doctor_info?: Json
          id?: string
          location: Json
          meta_access_token_encrypted?: string | null
          meta_ad_account_id?: string | null
          meta_token_expires_at?: string | null
          name: string
          onboarding_completed?: boolean
          owner_id: string
          services?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          brand_assets?: Json
          created_at?: string
          doctor_info?: Json
          id?: string
          location?: Json
          meta_access_token_encrypted?: string | null
          meta_ad_account_id?: string | null
          meta_token_expires_at?: string | null
          name?: string
          onboarding_completed?: boolean
          owner_id?: string
          services?: string[]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string
          updated_at?: string
        }
      }
      compliance_rules: {
        Row: {
          active: boolean
          applicable_services: string[] | null
          applicable_states: string[] | null
          banned_patterns: string[]
          banned_phrases: string[]
          category: string
          created_at: string
          description: string
          id: string
          required_disclaimers: string[]
          rule_name: string
          severity: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applicable_services?: string[] | null
          applicable_states?: string[] | null
          banned_patterns?: string[]
          banned_phrases?: string[]
          category: string
          created_at?: string
          description: string
          id?: string
          required_disclaimers?: string[]
          rule_name: string
          severity?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applicable_services?: string[] | null
          applicable_states?: string[] | null
          banned_patterns?: string[]
          banned_phrases?: string[]
          category?: string
          created_at?: string
          description?: string
          id?: string
          required_disclaimers?: string[]
          rule_name?: string
          severity?: string
          updated_at?: string
        }
      }
      competitor_ads: {
        Row: {
          ai_analysis: Json | null
          body_text: string | null
          clinic_id: string
          competitor_id: string | null
          created_at: string
          cta: string | null
          estimated_days_running: number
          first_seen: string
          headline: string | null
          id: string
          image_url: string | null
          landing_page_url: string | null
          last_seen: string
          meta_ad_id: string
          raw_data: Json
          ad_type: string
        }
        Insert: {
          ai_analysis?: Json | null
          body_text?: string | null
          clinic_id: string
          competitor_id?: string | null
          created_at?: string
          cta?: string | null
          estimated_days_running?: number
          first_seen?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          landing_page_url?: string | null
          last_seen?: string
          meta_ad_id: string
          raw_data?: Json
          ad_type?: string
        }
        Update: {
          ai_analysis?: Json | null
          body_text?: string | null
          clinic_id?: string
          competitor_id?: string | null
          created_at?: string
          cta?: string | null
          estimated_days_running?: number
          first_seen?: string
          headline?: string | null
          id?: string
          image_url?: string | null
          landing_page_url?: string | null
          last_seen?: string
          meta_ad_id?: string
          raw_data?: Json
          ad_type?: string
        }
      }
      competitors: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_active: boolean
          location: Json | null
          meta_page_id: string | null
          name: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: Json | null
          meta_page_id?: string | null
          name: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: Json | null
          meta_page_id?: string | null
          name?: string
        }
      }
      generation_batches: {
        Row: {
          angle_mix: Json
          clinic_id: string
          concepts_generated: number
          concepts_passed: number
          concepts_requested: number
          created_at: string
          error_message: string | null
          id: string
          status: string
          triggered_by: string
        }
        Insert: {
          angle_mix?: Json
          clinic_id: string
          concepts_generated?: number
          concepts_passed?: number
          concepts_requested?: number
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          triggered_by?: string
        }
        Update: {
          angle_mix?: Json
          clinic_id?: string
          concepts_generated?: number
          concepts_passed?: number
          concepts_requested?: number
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          triggered_by?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}