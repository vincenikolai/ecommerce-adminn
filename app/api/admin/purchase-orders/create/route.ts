import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { PurchaseOrderMaterial } from '@/types/purchase-order';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";

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

    if (!profile || (profile.role !== PURCHASING_MANAGER_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      console.error("API Route - Access Denied: Insufficient privileges for Purchasing Manager.");
      return NextResponse.json({ error: "Access Denied: Insufficient privileges for Purchasing Manager." }, { status: 403 });
    }

    const {
      supplierid,
      purchasequotationid,
      deliverydate,
      ponumber,
      status = 'Pending',
      materials,
    } = await req.json();

    if (!supplierid || !deliverydate || !ponumber || !materials || materials.length === 0) {
      return NextResponse.json({ error: "Missing required fields or materials for Purchase Order." }, { status: 400 });
    }

    const { data: newPurchaseOrder, error: poError } = await localAdminSupabase
      .from('purchaseorder')
      .insert({
        supplierid,
        purchasequotationid,
        deliverydate: deliverydate,
        ponumber: ponumber,
        status,
      })
      .select()
      .single();

    if (poError) {
      console.error("API Route - Error creating purchase order:", poError);
      return NextResponse.json({ error: poError.message }, { status: 500 });
    }

    // Insert materials if provided
    if (materials && materials.length > 0) {
      const materialsToInsert = materials.map((material: PurchaseOrderMaterial) => ({
        purchaseorderid: newPurchaseOrder.id,
        rawmaterialid: material.rawmaterialid,
        quantity: material.quantity,
        unitprice: material.unitprice,
      }));

      const { error: materialError } = await localAdminSupabase
        .from('purchaseordermaterial')
        .insert(materialsToInsert);

      if (materialError) {
        console.error("API Route - Error inserting purchase order materials:", materialError);
        // Optionally, you might want to delete the created PurchaseOrder here to maintain data integrity
        return NextResponse.json({ error: materialError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: "Purchase order created successfully", purchaseOrder: newPurchaseOrder });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in purchase order creation API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
