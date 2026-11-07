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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      live_matches: {Row:{match_key:string;status:string;period_started_at:string|null;elapsed_seconds:number;home_goals:number;away_goals:number;revision:number;started_at:string|null;finished_at:string|null;updated_at:string};Insert:{match_key:string;status?:string;period_started_at?:string|null;elapsed_seconds?:number;home_goals?:number;away_goals?:number;revision?:number;started_at?:string|null;finished_at?:string|null;updated_at?:string};Update:{status?:string;period_started_at?:string|null;elapsed_seconds?:number;home_goals?:number;away_goals?:number;revision?:number;started_at?:string|null;finished_at?:string|null;updated_at?:string};Relationships:[]}
      live_events: {Row:{id:string;match_key:string;client_request_id:string;kind:string;side:string;player_id:string|null;assist_player_id:string|null;minute:number;period:number;actor_id:string;voided_at:string|null;created_at:string};Insert:{match_key:string;client_request_id:string;kind:string;side:string;player_id?:string|null;assist_player_id?:string|null;minute:number;period:number;actor_id:string};Update:{voided_at?:string|null};Relationships:[]}
      team_photo: {
        Row: {id:boolean;image_path:string|null;caption:string;alt:string;width:number;height:number;updated_at:string}
        Insert: {id?:boolean;image_path?:string|null;caption?:string;alt?:string;width?:number;height?:number;updated_at?:string}
        Update: {image_path?:string|null;caption?:string;alt?:string;width?:number;height?:number}
        Relationships: []
      }
      admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      league_snapshots: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          active: boolean
          id: string
          name: string
          number: number
          photo_url: string | null
          position: string | null
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          number: number
          photo_url?: string | null
          position?: string | null
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          number?: number
          photo_url?: string | null
          position?: string | null
        }
        Relationships: []
      }
      published_reports: {
        Row: {
          entries: Json
          match_key: string
          note: string
          updated_at: string
        }
        Insert: {
          entries?: Json
          match_key: string
          note?: string
          updated_at?: string
        }
        Update: {
          entries?: Json
          match_key?: string
          note?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_drafts: {
        Row: {
          entries: Json
          match_key: string
          note: string
          updated_at: string
        }
        Insert: {
          entries?: Json
          match_key: string
          note?: string
          updated_at?: string
        }
        Update: {
          entries?: Json
          match_key?: string
          note?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      live_my_permissions: {Args:never;Returns:Json}
      live_admin_permissions: {Args:never;Returns:Json}
      live_set_permission: {Args:{p_user:string;p_record:boolean;p_control:boolean};Returns:undefined}
      live_control_match: {Args:{p_match:string;p_action:string};Returns:Json}
      live_record_event: {Args:{p_match:string;p_request:string;p_kind:string;p_side:string;p_player:string|null;p_assist:string|null;p_minute:number;p_period:number};Returns:string}
      live_void_event: {Args:{p_event:string};Returns:undefined}
      live_push_preference: {Args:{p_enabled:boolean};Returns:undefined}
      rincon_comments_page: { Args: {p_match_key?:string|null;p_player_id?:string|null;p_target_id?:string|null;p_offset?:number;p_focus_id?:string|null}; Returns:Json }
      save_rincon_comment: { Args: {p_match_key:string;p_target_id:string;p_body:string;p_mentions?:Json}; Returns:string }
      react_rincon_comment: { Args: {p_id:string;p_emoji?:string|null}; Returns:undefined }
      rincon_notices: { Args: {p_action?:string;p_payload?:Json}; Returns:Json }
      rincon_dispatch: { Args: {p_action:string;p_payload?:Json}; Returns:Json }
      match_comments_page: { Args: { p_match_key?: string|null; p_player_id?: string|null; p_target_id?: string|null; p_offset?: number }; Returns: Json }
      save_match_comment: { Args: { p_match_key: string; p_target_id: string; p_body: string }; Returns: string }
      delete_match_comment: { Args: { p_id: string }; Returns: undefined }
      record_activity: { Args: never; Returns: undefined }
      admin_user_activity: { Args: never; Returns: Json }
      team_portal: { Args: { p_action?: string; p_payload?: Json }; Returns: Json }
      mvp_results: { Args: never; Returns: Json }
      import_league: {
        Args: { p_data: Json; p_secret?: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      publish_report: {
        Args: { p_expected_at: string; p_match_key: string }
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const

