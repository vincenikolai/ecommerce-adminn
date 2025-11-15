import { User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole =
  | "admin"
  | "supplier_management_manager"
  | "customer"
  | "raw_material_manager"
  | "purchase_quotation_manager"
  | "purchasing_manager"
  | "warehouse_staff"
  | "sales_quotation_manager"
  | "finance_manager"
  | "order_manager"
  | "production_manager"
  | "sales_staff"
  | "sales_manager"
  | "rider"
  | "rider_manager"
  | "delivery_manager"
  | "products_manager";

// Extend Supabase's User interface
export type UserProfile = SupabaseUser & {
  first_name: string | null;
  last_name: string | null;
  ban_duration: string | null;
  role: UserRole;
  created_at?: string; // SupabaseUser already has created_at, but explicitly adding for clarity
};
