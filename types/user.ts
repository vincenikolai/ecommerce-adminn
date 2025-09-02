import { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = "admin" | "supplier_management_manager" | "customer";

// Extend Supabase's User interface
export type UserProfile = SupabaseUser & {
  first_name: string | null;
  last_name: string | null;
  ban_duration: string | null;
  role: UserRole;
  created_at?: string; // SupabaseUser already has created_at, but explicitly adding for clarity
};
