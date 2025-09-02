import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/admin'; // Assuming adminSupabase is configured correctly
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

const ADMIN_EMAIL = "eastlachemicals@gmail.com"; // Ensure this matches your admin email

export async function POST(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session || session.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Access Denied: Not an administrator." }, { status: 403 });
    }

    const { email, password, firstName, lastName, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Create user in Supabase Auth
    const { data: user, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email for admin-created users
      user_metadata: {
        first_name: firstName || null,
        last_name: lastName || null,
        role: role || "customer", // Set role, default to 'customer'
      },
    });

    if (createUserError) {
      console.error("Error creating Supabase Auth user:", createUserError);
      return NextResponse.json({ error: createUserError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "User creation failed for unknown reason." }, { status: 500 });
    }

    // Insert profile data into the 'profiles' table
    const { error: insertProfileError } = await adminSupabase.from('profiles').insert({
      id: user.user.id,
      email: user.user.email,
      first_name: firstName || null,
      last_name: lastName || null,
      role: role || "customer", // Set role, default to 'customer'
    });

    if (insertProfileError) {
      console.error("Error inserting profile data:", insertProfileError);
      // Consider rolling back user creation if profile insertion fails
      // For simplicity, we'll just return the error for now.
      return NextResponse.json({ error: insertProfileError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "User created successfully", userId: user.user.id });
  } catch (error: any) {
    console.error("Unexpected error in user creation API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during user creation." },
      { status: 500 }
    );
  }
}
