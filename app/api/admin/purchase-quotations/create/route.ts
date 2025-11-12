import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { PurchaseQuotation, PurchaseQuotationMaterial } from '@/types/purchase-quotation';
import { v4 as uuidv4 } from 'uuid';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager"; // Renamed role constant

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

    const cookieStore = cookies();
    const authClient = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session }, error: sessionError } = await authClient.auth.getSession();

    if (sessionError) {
      console.error("API Route - Session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 401 });
    }

    if (!session) {
      console.error("API Route - Access Denied: No active session.");
      return NextResponse.json({ error: "Access Denied: No active session." }, { status: 403 });
    }

    // Fetch the user's role from the profiles table
    const { data: profile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("API Route - Error fetching user profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || (profile.role !== SALES_QUOTATION_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      console.error("API Route - Access Denied: Insufficient privileges for Sales Quotation Manager.");
      return NextResponse.json({ error: "Access Denied: Insufficient privileges for Sales Quotation Manager." }, { status: 403 });
    }

    const { supplierId, quotedPrice, validityDate, materials } = await req.json() as PurchaseQuotation & { materials: Array<{ rawMaterialId: string; quantity: number }> }; // Changed to rawMaterialId

    if (!supplierId || quotedPrice === undefined || !validityDate || !materials || materials.length === 0) {
      return NextResponse.json({ error: "Supplier, quoted price, validity date, and at least one material are required." }, { status: 400 });
    }

    const newQuotationId = uuidv4();

    // Insert PurchaseQuotation
    const { data: quotationData, error: insertQuotationError } = await localAdminSupabase
      .from('PurchaseQuotation')
      .insert([{ id: newQuotationId, supplierId, quotedPrice, validityDate }])
      .select();

    if (insertQuotationError) {
      console.error("API Route - Error inserting purchase quotation:", insertQuotationError);
      return NextResponse.json({ error: insertQuotationError.message }, { status: 500 });
    }

    if (!quotationData || quotationData.length === 0) {
        throw new Error("Failed to retrieve created purchase quotation data.");
    }

    const createdQuotation = quotationData[0];

    // Insert PurchaseQuotationMaterial items
    const materialInserts = materials.map(mat => ({
      id: uuidv4(), // Generate UUID for each material item
      purchasequotationid: newQuotationId,
      rawmaterialid: mat.rawMaterialId, // Changed from mat.rawmaterialid to mat.rawMaterialId
      quantity: mat.quantity,
    }));

    const { data: materialData, error: insertMaterialsError } = await localAdminSupabase
      .from('purchasequotationmaterial')
      .insert(materialInserts)
      .select();

    if (insertMaterialsError) {
      console.error("API Route - Error inserting purchase quotation materials:", insertMaterialsError);
      // Consider rolling back the quotation if materials fail, or handle partially created state
      return NextResponse.json({ error: insertMaterialsError.message }, { status: 500 });
    }

    // Optionally, re-fetch the full quotation with materials to return a complete object
    const { data: fullQuotation, error: fetchFullQuotationError } = await localAdminSupabase
        .from('PurchaseQuotation')
        .select(`
            id,
            supplierId,
            quotedPrice,
            validityDate,
            createdAt,
            updatedAt,
            materials:purchasequotationmaterial (
                id,
                rawmaterialid,
                quantity
            )
        `)
        .eq('id', newQuotationId)
        .single();

    if (fetchFullQuotationError) {
        console.error("API Route - Error fetching full created quotation:", fetchFullQuotationError);
        return NextResponse.json({ message: "Sales quotation created successfully (materials might be incomplete in response)", purchaseQuotation: createdQuotation });
    }

    return NextResponse.json({ message: "Sales quotation created successfully", purchaseQuotation: fullQuotation });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in sales quotation creation API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
