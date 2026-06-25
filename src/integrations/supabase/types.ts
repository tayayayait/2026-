export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      alert_events: {
        Row: {
          created_at: string;
          farm_id: string;
          farm_name: string;
          id: string;
          message: string;
          read_at: string | null;
          region: string;
          severity: string;
          snapshot_id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at: string;
          farm_id: string;
          farm_name: string;
          id: string;
          message: string;
          read_at?: string | null;
          region: string;
          severity: string;
          snapshot_id: string;
          title: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          farm_id?: string;
          farm_name?: string;
          id?: string;
          message?: string;
          read_at?: string | null;
          region?: string;
          severity?: string;
          snapshot_id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_events_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_events_snapshot_id_fkey";
            columns: ["snapshot_id"];
            isOneToOne: false;
            referencedRelation: "analysis_snapshots";
            referencedColumns: ["id"];
          },
        ];
      };
      analysis_snapshots: {
        Row: {
          analyzed_at: string;
          created_at: string;
          crop: string;
          farm_id: string;
          farm_name: string;
          id: string;
          level: string;
          pest_count: number;
          recommended_works: string[];
          region: string;
          score: number | null;
          source_status: Json;
          weather: Json | null;
        };
        Insert: {
          analyzed_at: string;
          created_at?: string;
          crop: string;
          farm_id: string;
          farm_name: string;
          id: string;
          level: string;
          pest_count?: number;
          recommended_works?: string[];
          region: string;
          score?: number | null;
          source_status: Json;
          weather?: Json | null;
        };
        Update: {
          analyzed_at?: string;
          created_at?: string;
          crop?: string;
          farm_id?: string;
          farm_name?: string;
          id?: string;
          level?: string;
          pest_count?: number;
          recommended_works?: string[];
          region?: string;
          score?: number | null;
          source_status?: Json;
          weather?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_snapshots_farm_id_fkey";
            columns: ["farm_id"];
            isOneToOne: false;
            referencedRelation: "farms";
            referencedColumns: ["id"];
          },
        ];
      };
      farms: {
        Row: {
          address: string;
          area: number;
          createdAt: string;
          crop: string;
          growth_stage_code: string | null;
          id: string;
          interestedWork: string[];
          lat: number;
          lng: number;
          name: string;
          parcel: Json | null;
          region: string;
          stage: string;
          user_id: string | null;
        };
        Insert: {
          address: string;
          area: number;
          createdAt?: string;
          crop: string;
          growth_stage_code?: string | null;
          id: string;
          interestedWork?: string[];
          lat: number;
          lng: number;
          name: string;
          parcel?: Json | null;
          region: string;
          stage: string;
          user_id?: string | null;
        };
        Update: {
          address?: string;
          area?: number;
          createdAt?: string;
          crop?: string;
          growth_stage_code?: string | null;
          id?: string;
          interestedWork?: string[];
          lat?: number;
          lng?: number;
          name?: string;
          parcel?: Json | null;
          region?: string;
          stage?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      notification_delivery_logs: {
        Row: {
          attempt_count: number;
          attempted_at: string;
          channel: string;
          event_id: string;
          id: string;
          next_retry_at: string | null;
          reason: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          attempt_count: number;
          attempted_at: string;
          channel: string;
          event_id: string;
          id: string;
          next_retry_at?: string | null;
          reason?: string | null;
          status: string;
          user_id?: string;
        };
        Update: {
          attempt_count?: number;
          attempted_at?: string;
          channel?: string;
          event_id?: string;
          id?: string;
          next_retry_at?: string | null;
          reason?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_delivery_logs_user_id_event_id_fkey";
            columns: ["user_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "alert_events";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          browser_enabled: boolean;
          consented_at: string | null;
          minimum_severity: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          browser_enabled?: boolean;
          consented_at?: string | null;
          minimum_severity?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          browser_enabled?: boolean;
          consented_at?: string | null;
          minimum_severity?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
