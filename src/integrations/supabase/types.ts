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
  public: {
    Tables: {
      addons: {
        Row: {
          description: string | null
          icon: string | null
          id: string
          name: string
          price: number
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          price?: number
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          price?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          reading_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          reading_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      colors: {
        Row: {
          fabric_id: string
          hex: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          fabric_id: string
          hex: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          fabric_id?: string
          hex?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "colors_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabrics"
            referencedColumns: ["id"]
          },
        ]
      }
      fabrics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price_modifier: number
          slug: string
          sort_order: number
          texture_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_modifier?: number
          slug: string
          sort_order?: number
          texture_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_modifier?: number
          slug?: string
          sort_order?: number
          texture_url?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          city: string | null
          created_at: string
          discount_code: string | null
          email: string
          id: string
          source: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          discount_code?: string | null
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          discount_code?: string | null
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          addons_snapshot: Json | null
          admin_notes: string | null
          balance_due: number
          created_at: string
          customer_notes: string | null
          delivery_address: string | null
          delivery_city: string | null
          deposit_paid: number
          discount: number
          expected_delivery_date: string | null
          fabric_snapshot: Json | null
          id: string
          order_number: string
          phone: string | null
          size_snapshot: Json | null
          sofa_id: string | null
          sofa_snapshot: Json
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          addons_snapshot?: Json | null
          admin_notes?: string | null
          balance_due?: number
          created_at?: string
          customer_notes?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          deposit_paid?: number
          discount?: number
          expected_delivery_date?: string | null
          fabric_snapshot?: Json | null
          id?: string
          order_number?: string
          phone?: string | null
          size_snapshot?: Json | null
          sofa_id?: string | null
          sofa_snapshot?: Json
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          addons_snapshot?: Json | null
          admin_notes?: string | null
          balance_due?: number
          created_at?: string
          customer_notes?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          deposit_paid?: number
          discount?: number
          expected_delivery_date?: string | null
          fabric_snapshot?: Json | null
          id?: string
          order_number?: string
          phone?: string | null
          size_snapshot?: Json | null
          sofa_id?: string | null
          sofa_snapshot?: Json
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_sofa_id_fkey"
            columns: ["sofa_id"]
            isOneToOne: false
            referencedRelation: "sofas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      showrooms: {
        Row: {
          address: string
          city: string
          hero_image: string | null
          hours: string | null
          id: string
          is_flagship: boolean
          map_url: string | null
          name: string
          phone: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          address: string
          city: string
          hero_image?: string | null
          hours?: string | null
          id?: string
          is_flagship?: boolean
          map_url?: string | null
          name: string
          phone?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          address?: string
          city?: string
          hero_image?: string | null
          hours?: string | null
          id?: string
          is_flagship?: boolean
          map_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      sizes: {
        Row: {
          depth_cm: number | null
          height_cm: number | null
          id: string
          name: string
          price_modifier: number
          seater_count: number | null
          slug: string
          sort_order: number
          width_cm: number | null
        }
        Insert: {
          depth_cm?: number | null
          height_cm?: number | null
          id?: string
          name: string
          price_modifier?: number
          seater_count?: number | null
          slug: string
          sort_order?: number
          width_cm?: number | null
        }
        Update: {
          depth_cm?: number | null
          height_cm?: number | null
          id?: string
          name?: string
          price_modifier?: number
          seater_count?: number | null
          slug?: string
          sort_order?: number
          width_cm?: number | null
        }
        Relationships: []
      }
      sofa_addons: {
        Row: {
          addon_id: string
          sofa_id: string
        }
        Insert: {
          addon_id: string
          sofa_id: string
        }
        Update: {
          addon_id?: string
          sofa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sofa_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sofa_addons_sofa_id_fkey"
            columns: ["sofa_id"]
            isOneToOne: false
            referencedRelation: "sofas"
            referencedColumns: ["id"]
          },
        ]
      }
      sofa_fabrics: {
        Row: {
          fabric_id: string
          sofa_id: string
        }
        Insert: {
          fabric_id: string
          sofa_id: string
        }
        Update: {
          fabric_id?: string
          sofa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sofa_fabrics_fabric_id_fkey"
            columns: ["fabric_id"]
            isOneToOne: false
            referencedRelation: "fabrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sofa_fabrics_sofa_id_fkey"
            columns: ["sofa_id"]
            isOneToOne: false
            referencedRelation: "sofas"
            referencedColumns: ["id"]
          },
        ]
      }
      sofa_sizes: {
        Row: {
          size_id: string
          sofa_id: string
        }
        Insert: {
          size_id: string
          sofa_id: string
        }
        Update: {
          size_id?: string
          sofa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sofa_sizes_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sofa_sizes_sofa_id_fkey"
            columns: ["sofa_id"]
            isOneToOne: false
            referencedRelation: "sofas"
            referencedColumns: ["id"]
          },
        ]
      }
      sofas: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string
          delivery_days: number | null
          description: string | null
          dimensions: string | null
          features: string[] | null
          full_description: string | null
          gallery: string[] | null
          hero_image: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          materials: string | null
          model_url: string | null
          name: string
          sale_price: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          base_price: number
          category_id?: string | null
          created_at?: string
          delivery_days?: number | null
          description?: string | null
          dimensions?: string | null
          features?: string[] | null
          full_description?: string | null
          gallery?: string[] | null
          hero_image?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          materials?: string | null
          model_url?: string | null
          name: string
          sale_price?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          delivery_days?: number | null
          description?: string | null
          dimensions?: string | null
          features?: string[] | null
          full_description?: string | null
          gallery?: string[] | null
          hero_image?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          materials?: string | null
          model_url?: string | null
          name?: string
          sale_price?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sofas_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer"
      order_status:
        | "pending_deposit"
        | "confirmed"
        | "in_production"
        | "quality_check"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "staff", "customer"],
      order_status: [
        "pending_deposit",
        "confirmed",
        "in_production",
        "quality_check",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
