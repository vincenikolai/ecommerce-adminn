import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '@/types/user';
import { ReceivingReport, ReceivingReportItem } from '@/types/receiving-report';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";

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
      return NextResponse.json({ error: "Access Denied: No active session." }, { status: 403 });
    }

    const { data: profile, error: profileError } = await localAdminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error("API Route - Error fetching user profile:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || (profile.role !== WAREHOUSE_STAFF_ROLE && session.user?.email !== ADMIN_EMAIL)) {
      console.error("API Route - Access Denied: Insufficient privileges for Warehouse Staff.");
      return NextResponse.json({ error: "Access Denied: Insufficient privileges for Warehouse Staff." }, { status: 403 });
    }

    const { purchaseorderid, receiveddate, warehouselocation, notes, items } = await req.json() as ReceivingReport;

    if (!purchaseorderid || !receiveddate || !warehouselocation || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields for receiving report." }, { status: 400 });
    }

    const { data: receivingReportData, error: rrError } = await localAdminSupabase
      .from('receivingreport')
      .insert({
        purchaseorderid,
        receiveddate,
        warehouselocation,
        notes,
      })
      .select()
      .single();

    if (rrError) {
      console.error("API Route - Error creating receiving report:", rrError);
      return NextResponse.json({ error: rrError.message }, { status: 500 });
    }

    if (!receivingReportData) {
      return NextResponse.json({ error: "Failed to create receiving report, no data returned." }, { status: 500 });
    }

    const receivingReportItemsToInsert = items.map(item => ({
      receivingreportid: receivingReportData.id,
      rawmaterialid: item.rawmaterialid,
      quantity: item.quantity,
    }));

    const { error: rriError } = await localAdminSupabase
      .from('receivingreportitem')
      .insert(receivingReportItemsToInsert);

    if (rriError) {
      console.error("API Route - Error creating receiving report items:", rriError);
      // Consider rolling back the receivingReportData if items fail, though triggers handle stock
      return NextResponse.json({ error: rriError.message }, { status: 500 });
    }

    // Update purchase order status from "Approved" to "Delivered"
    const { error: poUpdateError } = await localAdminSupabase
      .from('purchaseorder')
      .update({ status: 'Delivered' })
      .eq('id', purchaseorderid);

    if (poUpdateError) {
      console.error("API Route - Error updating purchase order status:", poUpdateError);
      // Note: We don't fail the request here since the receiving report was created successfully
      // The status update is a side effect that can be fixed manually if needed
      console.warn("Warning: Receiving report created but PO status update failed. PO ID:", purchaseorderid);
    } else {
      console.log("API Route - Successfully updated purchase order status to 'Delivered' for PO:", purchaseorderid);
    }

    return NextResponse.json({ message: "Receiving report created successfully", receivingReport: receivingReportData });

  } catch (error: unknown) {
    console.error("API Route - Unexpected error in receiving report create API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
