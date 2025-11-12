import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { PurchaseQuotation } from '@/types/purchase-quotation';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

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

    const authClient = createRouteHandlerClient({ cookies });
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

    const { id, supplierId, quotedPrice, validityDate, materials } = await req.json() as PurchaseQuotation & { materials: Array<{ rawMaterialId: string; quantity: number }> };

    if (!id || !supplierId || quotedPrice === undefined || !validityDate || !materials || materials.length === 0) {
      return NextResponse.json({ error: "Purchase quotation ID, supplier, quoted price, validity date, and at least one material are required." }, { status: 400 });
    }

    // Update PurchaseQuotation
    const { data: quotationData, error: updateQuotationError } = await localAdminSupabase
      .from('PurchaseQuotation')
      .update({ supplierId, quotedPrice, validityDate })
      .eq('id', id)
      .select();

    if (updateQuotationError) {
      console.error("API Route - Error updating purchase quotation:", updateQuotationError);
      return NextResponse.json({ error: updateQuotationError.message }, { status: 500 });
    }

    if (!quotationData || quotationData.length === 0) {
        return NextResponse.json({ error: "Purchase quotation not found or no changes made." }, { status: 404 });
    }

    // Handle materials update: This is more complex than simple update.
    // A common strategy is to delete existing materials for this quotation and then re-insert new ones.
    // Alternatively, fetch existing, compare, and then perform inserts/updates/deletes.
    // For simplicity, let's delete all and re-insert.

    const { error: deleteMaterialsError } = await localAdminSupabase
      .from('PurchaseQuotationMaterial')
      .delete()
      .eq('purchaseQuotationId', id);

    if (deleteMaterialsError) {
      console.error("API Route - Error deleting old quotation materials:", deleteMaterialsError);
      // Log but don't necessarily fail the whole request if quotation update was successful
    }

    const materialInserts = materials.map(mat => ({
      id: uuidv4(), // Generate UUID for each material item
      purchaseQuotationId: id,
      rawMaterialId: mat.rawMaterialId,
      quantity: mat.quantity,
    }));

    const { data: materialData, error: insertMaterialsError } = await localAdminSupabase
      .from('PurchaseQuotationMaterial')
      .insert(materialInserts)
      .select();

    if (insertMaterialsError) {
      console.error("API Route - Error inserting new quotation materials:", insertMaterialsError);
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
            materials:PurchaseQuotationMaterial (
                id,
                rawMaterialId,
                quantity
            )
        `)
        .eq('id', id)
        .single();

    if (fetchFullQuotationError) {
        console.error("API Route - Error fetching full updated quotation:", fetchFullQuotationError);
        return NextResponse.json({ message: "Sales quotation updated successfully (materials might be incomplete in response)", purchaseQuotation: quotationData[0] });
    }

    return NextResponse.json({ message: "Sales quotation updated successfully", purchaseQuotation: fullQuotation });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in sales quotation update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
