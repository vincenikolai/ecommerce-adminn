import { User as SupabaseUser } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface User extends SupabaseUser {
    banned_until?: string | null;
  }
}

