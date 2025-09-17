import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { PurchaseOrderMaterial } from '@/types/purchase-order';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";

export async function PATCH(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Purchase Order ID is required." }, { status: 400 });
    }

    const {
      supplierid,
      purchasequotationid,
      deliverydate,
      ponumber,
      status,
      materials,
    } = await req.json();

    // Update the main PurchaseOrder table
    const { data: updatedPurchaseOrder, error: poError } = await localAdminSupabase
      .from('purchaseorder')
      .update({
        supplierid,
        purchasequotationid,
        deliverydate: deliverydate,
        ponumber: ponumber,
        status,
      })
      .eq('id', id)
      .select()
      .single();

    if (poError) {
      console.error("API Route - Error updating purchase order:", poError);
      return NextResponse.json({ error: poError.message }, { status: 500 });
    }

    // Handle materials update: First delete existing materials, then insert new ones
    if (materials) {
      const { error: deleteMaterialsError } = await localAdminSupabase
        .from('purchaseordermaterial')
        .delete()
        .eq('purchaseorderid', id);

      if (deleteMaterialsError) {
        console.error("API Route - Error deleting existing purchase order materials:", deleteMaterialsError);
        return NextResponse.json({ error: deleteMaterialsError.message }, { status: 500 });
      }

      if (materials.length > 0) {
        const materialsToInsert = materials.map((material: PurchaseOrderMaterial) => ({
          purchaseorderid: id,
          rawmaterialid: material.rawmaterialid,
          quantity: material.quantity,
          unitprice: material.unitprice,
        }));

        const { error: insertMaterialsError } = await localAdminSupabase
          .from('purchaseordermaterial')
          .insert(materialsToInsert);

        if (insertMaterialsError) {
          console.error("API Route - Error inserting new purchase order materials:", insertMaterialsError);
          return NextResponse.json({ error: insertMaterialsError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: "Purchase order updated successfully", purchaseOrder: updatedPurchaseOrder });
  } catch (error: unknown) {
    console.error("API Route - Unexpected error in purchase order update API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
