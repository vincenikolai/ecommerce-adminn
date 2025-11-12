import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RawMaterial } from '@/types/raw-material'; // Updated import
import { UserProfile, UserRole } from '@/types/user';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager";

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

    if (!profile || (profile.role !== RAW_MATERIAL_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      return NextResponse.json({ error: "Access Denied: Insufficient privileges for Raw Material Manager." }, { status: 403 });
    }

    const { name, category, type, unitOfMeasure, stock, defaultSupplierId } = await req.json() as RawMaterial & { type?: string };

    if (!name || !category || !unitOfMeasure || stock === undefined) {
      return NextResponse.json({ error: "Material name, category, unit of measure, and stock are required." }, { status: 400 });
    }

    const newRawMaterialId = uuidv4(); // Generate a new UUID

    const { data, error: insertError } = await localAdminSupabase
      .from('RawMaterial')
      .insert([{ id: newRawMaterialId, name, category, materialType: type || 'Raw Material', unitOfMeasure, stock, defaultSupplierId }]) // Include the generated ID, let DB handle timestamps
      .select();

    if (insertError) {
      console.error("Error inserting raw material:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Raw material created successfully", rawMaterial: data[0] });
  } catch (error: unknown) {
    console.error("Unexpected error in raw material creation API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
