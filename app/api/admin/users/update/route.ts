import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { UserRole } from '@/types/user'; // Import UserRole

const ADMIN_EMAIL = "eastlachemicals@gmail.com"; // Ensure this matches your admin email
const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager"; // Define new role

// Define all roles that an admin is allowed to assign
const ALLOWED_ROLES: UserRole[] = [
  "customer",
  "admin",
  "purchasing_manager",
  "warehouse_staff",
  "raw_material_manager",
  "finance_manager",
  "supplier_management_manager",
  "sales_quotation_manager",
  "order_manager",
  "production_manager",
  "sales_staff",
];

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const authClient = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session || session.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Access Denied: Not an administrator." }, { status: 403 });
    }

    const { userId, firstName, lastName, role } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    // Validate the role
    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role specified: ${role}` }, { status: 400 });
    }

    // Update user metadata in Supabase Auth
    const { error: updateUserError } = await adminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        first_name: firstName || null,
        last_name: lastName || null,
        role: role, // This will be the validated role or undefined
      },
    });

    if (updateUserError) {
      console.error("Error updating Supabase Auth user metadata:", updateUserError);
      return NextResponse.json({ error: updateUserError.message }, { status: 500 });
    }

    // Update profile data in the 'profiles' table
    const { error: updateProfileError } = await adminSupabase.from('profiles').update({
      first_name: firstName || null,
      last_name: lastName || null,
      role: role, // This will be the validated role or undefined
    }).eq('id', userId);

    if (updateProfileError) {
      console.error("Error updating profile data:", updateProfileError);
      return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "User updated successfully", userId });
  } catch (error: any) {
    console.error("Unexpected error in user update API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during user update." },
      { status: 500 }
    );
  }
}
