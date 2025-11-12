import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Database } from "@/lib/database.types";

export async function DELETE(req: Request) {
  const cookieStore = cookies();
  const localAdminSupabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore,
  });

  // Check if we have a session
  const { data: sessionData, error: sessionError } =
    await localAdminSupabase.auth.getSession();

  if (sessionError) {
    console.error("Session error:", sessionError);
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const user = sessionData.session?.user;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Basic role check (adjust as per your role management)
  const { data: profile, error: profileError } = await localAdminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const ADMIN_EMAIL = "eastlachemicals@gmail.com";
  const allowedRoles = ["purchasing_manager", "sales_quotation_manager"];

  if (profileError || !profile || (!allowedRoles.includes(profile.role) && user.email !== ADMIN_EMAIL)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("id");

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  try {
    // Delete associated PurchaseOrderMaterial first due to cascade behavior
    const { error: deleteMaterialsError } = await localAdminSupabase
      .from("purchaseordermaterial")
      .delete()
      .eq("purchaseorderid", orderId);

    if (deleteMaterialsError) {
      console.error(
        "Error deleting purchase order materials:",
        deleteMaterialsError
      );
      return NextResponse.json(
        { error: deleteMaterialsError.message },
        { status: 500 }
      );
    }

    // Then delete the PurchaseOrder itself
    const { error: deleteOrderError } = await localAdminSupabase
      .from("purchaseorder") // Corrected to lowercase
      .delete()
      .eq("id", orderId);

    if (deleteOrderError) {
      console.error("Error deleting purchase order:", deleteOrderError);
      return NextResponse.json(
        { error: deleteOrderError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Purchase order deleted" }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error deleting purchase order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
