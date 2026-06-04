// Hand-authored to mirror supabase/migrations/0001_init.sql.
// Regenerate with `npx supabase gen types typescript` once the project is live.

export type TripStatus = "dreaming" | "upcoming" | "active" | "past";
export type EventStatus = "idea" | "planned" | "booked" | "done";
export type PackOwner = "a" | "b" | "shared";
export type TargetType = "event" | "photo" | "day" | "trip";

type Timestamps = { created_at: string };

export type Database = {
  public: {
    Tables: {
      spaces: {
        Row: {
          id: string;
          name: string;
          home_tz_a: string | null;
          home_tz_b: string | null;
          invite_code: string;
        } & Timestamps;
        Insert: { id?: string; name?: string; home_tz_a?: string | null; home_tz_b?: string | null };
        Update: Partial<{ name: string; home_tz_a: string | null; home_tz_b: string | null }>;
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          space_id: string;
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          home_city: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          space_id: string;
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          home_city?: string | null;
        };
        Update: Partial<{ display_name: string | null; avatar_url: string | null; home_city: string | null }>;
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          space_id: string;
          title: string;
          destination: string | null;
          start_date: string | null;
          end_date: string | null;
          status: TripStatus;
          status_override: boolean;
          accent_color: string | null;
          cover_photo_url: string | null;
          currency: string;
          created_by: string | null;
          updated_at: string;
        } & Timestamps;
        Insert: {
          id?: string;
          space_id: string;
          title: string;
          destination?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: TripStatus;
          status_override?: boolean;
          accent_color?: string | null;
          cover_photo_url?: string | null;
          currency?: string;
          created_by?: string | null;
        };
        Update: Partial<{
          title: string;
          destination: string | null;
          start_date: string | null;
          end_date: string | null;
          status: TripStatus;
          status_override: boolean;
          accent_color: string | null;
          cover_photo_url: string | null;
          currency: string;
        }>;
        Relationships: [];
      };
      days: {
        Row: {
          id: string;
          trip_id: string;
          date: string;
          summary_note: string | null;
          rating: number | null;
          updated_at: string;
        } & Timestamps;
        Insert: { id?: string; trip_id: string; date: string; summary_note?: string | null; rating?: number | null };
        Update: Partial<{ date: string; summary_note: string | null; rating: number | null }>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          space_id: string | null;
          name: string;
          color: string;
          icon: string | null;
          is_default: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          space_id?: string | null;
          name: string;
          color?: string;
          icon?: string | null;
          is_default?: boolean;
        };
        Update: Partial<{ name: string; color: string; icon: string | null }>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          trip_id: string;
          day_id: string | null;
          title: string;
          category_id: string | null;
          start_time: string | null;
          end_time: string | null;
          location_name: string | null;
          lat: number | null;
          lng: number | null;
          notes: string | null;
          cost: number | null;
          currency: string | null;
          booking_ref: string | null;
          status: EventStatus;
          sort_order: number;
          created_by: string | null;
          updated_at: string;
        } & Timestamps;
        Insert: {
          id?: string;
          trip_id: string;
          day_id?: string | null;
          title: string;
          category_id?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          location_name?: string | null;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          cost?: number | null;
          currency?: string | null;
          booking_ref?: string | null;
          status?: EventStatus;
          sort_order?: number;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          trip_id: string;
          day_id: string | null;
          event_id: string | null;
          storage_path: string;
          caption: string | null;
          taken_at: string | null;
          uploaded_by: string | null;
          is_favorite: boolean;
        } & Timestamps;
        Insert: {
          id?: string;
          trip_id: string;
          day_id?: string | null;
          event_id?: string | null;
          storage_path: string;
          caption?: string | null;
          taken_at?: string | null;
          uploaded_by?: string | null;
          is_favorite?: boolean;
        };
        Update: Partial<{ caption: string | null; is_favorite: boolean; day_id: string | null; event_id: string | null }>;
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          id: string;
          space_id: string;
          title: string;
          place: string | null;
          note: string | null;
          added_by: string | null;
          votes_a: number;
          votes_b: number;
          promoted_to_trip_id: string | null;
          updated_at: string;
        } & Timestamps;
        Insert: {
          id?: string;
          space_id: string;
          title: string;
          place?: string | null;
          note?: string | null;
          added_by?: string | null;
          votes_a?: number;
          votes_b?: number;
          promoted_to_trip_id?: string | null;
        };
        Update: Partial<{
          title: string;
          place: string | null;
          note: string | null;
          votes_a: number;
          votes_b: number;
          promoted_to_trip_id: string | null;
        }>;
        Relationships: [];
      };
      packing_items: {
        Row: {
          id: string;
          trip_id: string;
          label: string;
          qty: number;
          owner: PackOwner;
          is_packed: boolean;
        } & Timestamps;
        Insert: { id?: string; trip_id: string; label: string; qty?: number; owner?: PackOwner; is_packed?: boolean };
        Update: Partial<{ label: string; qty: number; owner: PackOwner; is_packed: boolean }>;
        Relationships: [];
      };
      reactions: {
        Row: {
          id: string;
          space_id: string;
          target_type: TargetType;
          target_id: string;
          member_id: string;
          emoji: string | null;
          note: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          space_id: string;
          target_type: TargetType;
          target_id: string;
          member_id: string;
          emoji?: string | null;
          note?: string | null;
        };
        Update: Partial<{ emoji: string | null; note: string | null }>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          space_id: string;
          target_type: TargetType;
          target_id: string;
          member_id: string;
          body: string;
        } & Timestamps;
        Insert: {
          id?: string;
          space_id: string;
          target_type: TargetType;
          target_id: string;
          member_id: string;
          body: string;
        };
        Update: Partial<{ body: string }>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_space: {
        Args: {
          p_name: string;
          p_display_name: string;
          p_home_city: string;
          p_home_tz: string;
        };
        Returns: string;
      };
      join_space: {
        Args: {
          p_invite_code: string;
          p_display_name: string;
          p_home_city: string;
          p_home_tz: string;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
