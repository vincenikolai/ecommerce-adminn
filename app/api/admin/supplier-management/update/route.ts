import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SupplierManagementItem } from '@/types/supplier-management'; // Updated import
import { UserProfile, UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SUPPLIER_MANAGEMENT_MANAGER_ROLE: UserRole = "supplier_management_manager"; // Renamed role constant

export async function POST(req: Request) {
  let supabaseUrl = '';
  let supabaseServiceRoleKey = '';

  try {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables for Supabase admin client in API route');
    }

    const localAdminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const authClient = createRouteHandlerClient({ cookies: () => cookies() });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: "Access Denied: No active session." }, { status: 403 });
    }

    // Fetch the user's role from the profiles table
    const { data: profile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || (profile.role !== SUPPLIER_MANAGEMENT_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json({ error: "Access Denied: Insufficient privileges." }, { status: 403 });
    }

    const { id, name, description, price, stock, supplier_shop, date } = await req.json() as SupplierManagementItem; // Destructure new fields

    if (!id || !name || !price || stock === undefined || !supplier_shop || !date) { // Updated validation
      return NextResponse.json({ error: "Supplier management item ID, name, price, stock, supplier shop, and date are required." }, { status: 400 }); // Updated error message
    }

    const { data, error: updateError } = await localAdminSupabase
      .from('supplier_management_items') // Updated table name
      .update({ name, description, price, stock, supplier_shop, date })
      .eq('id', id)
      .select();

    if (updateError) {
      console.error("Error updating supplier management item:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Supplier management item not found or no changes made." }, { status: 404 });
    }

    return NextResponse.json({ message: "Supplier management item updated successfully", product: data[0] }); // Changed 'item' back to 'product'
  } catch (error: unknown) {
    console.error("Unexpected error in supplier management item update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
