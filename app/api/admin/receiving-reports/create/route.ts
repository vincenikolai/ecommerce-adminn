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

    // Fetch purchase order materials BEFORE inserting receiving report items
    // This ensures we have the original expected quantities before any updates
    const { data: purchaseOrderMaterials, error: pomFetchError } = await localAdminSupabase
      .from('purchaseordermaterial')
      .select('id, rawmaterialid, quantity')
      .eq('purchaseorderid', purchaseorderid);

    if (pomFetchError) {
      console.error("API Route - Error fetching purchase order materials:", pomFetchError);
      // Rollback: Delete the receiving report if we can't fetch materials
      await localAdminSupabase
        .from('receivingreport')
        .delete()
        .eq('id', receivingReportData.id);
      return NextResponse.json({ error: "Failed to fetch purchase order materials." }, { status: 500 });
    }

    if (!purchaseOrderMaterials || purchaseOrderMaterials.length === 0) {
      console.warn("Warning: No purchase order materials found for this purchase order.");
      // Rollback: Delete the receiving report
      await localAdminSupabase
        .from('receivingreport')
        .delete()
        .eq('id', receivingReportData.id);
      return NextResponse.json({ error: "No purchase order materials found for this purchase order." }, { status: 400 });
    }

    // Map items to include purchaseordermaterialid for FK relationship
    const receivingReportItemsToInsert = items.map(item => {
      // Find the corresponding purchaseordermaterial record
      const pomRecord = purchaseOrderMaterials.find((pom: any) => pom.rawmaterialid === item.rawmaterialid);
      
      return {
        receivingreportid: receivingReportData.id,
        rawmaterialid: item.rawmaterialid,
        quantity: item.quantity,
        purchaseordermaterialid: pomRecord?.id || null, // Link to purchaseordermaterial via FK
      };
    });

    const { error: rriError } = await localAdminSupabase
      .from('receivingreportitem')
      .insert(receivingReportItemsToInsert);

    if (rriError) {
      console.error("API Route - Error creating receiving report items:", rriError);
      // Rollback: Delete the receiving report if items fail
      await localAdminSupabase
        .from('receivingreport')
        .delete()
        .eq('id', receivingReportData.id);
      return NextResponse.json({ error: rriError.message }, { status: 500 });
    }

    // Directly set purchaseordermaterial quantity to received quantity (not subtract)
    console.log(`API Route - ======= STARTING QUANTITY UPDATE =======`);
    console.log(`API Route - Purchase order materials:`, JSON.stringify(purchaseOrderMaterials, null, 2));
    console.log(`API Route - Items to process:`, JSON.stringify(items, null, 2));
    
    for (const item of items) {
      console.log(`API Route - Processing item:`, item.rawmaterialid, `quantity:`, item.quantity);
      
      // Find the corresponding purchaseordermaterial record
      const pomRecord = purchaseOrderMaterials.find((pom: any) => pom.rawmaterialid === item.rawmaterialid);
      
      console.log(`API Route - Found POM record:`, pomRecord ? `ID=${pomRecord.id}, current quantity=${pomRecord.quantity}` : 'NOT FOUND');
      
      if (!pomRecord) {
        console.warn(`Warning: No purchase order material record found for raw material ${item.rawmaterialid}. Cannot update quantity.`);
        continue;
      }

      // Directly set the quantity to the received quantity
      const receivedQty = item.quantity || 0;

      console.log(`API Route - [BEFORE UPDATE] Purchase order material ${pomRecord.id} (${item.rawmaterialid}): setting quantity to ${receivedQty}`);

      // Update the purchase order material quantity directly
      const { data: updatedPOM, error: updatePOMError } = await localAdminSupabase
        .from('purchaseordermaterial')
        .update({ quantity: receivedQty })
        .eq('id', pomRecord.id)
        .select('quantity')
        .single();

      if (updatePOMError) {
        console.error(`API Route - ❌ Error updating purchase order material quantity for ${item.rawmaterialid}:`, updatePOMError);
        console.warn(`Warning: Receiving report created but purchase order material quantity update failed for material ${item.rawmaterialid}.`);
      } else if (updatedPOM) {
        console.log(`API Route - ✅ Successfully updated purchase order material quantity for ${item.rawmaterialid} to ${updatedPOM.quantity}`);
      } else {
        console.error(`API Route - ❌ Update returned no data for purchase order material ${pomRecord.id}`);
      }
      
      // Note: RawMaterial stock is automatically incremented by database trigger
      // trg_increment_raw_material_stock when receivingreportitem is inserted
    }
    
    console.log(`API Route - ======= FINISHED QUANTITY UPDATE =======`);

    // Fetch purchase order for status update
    const { data: purchaseOrder, error: poFetchError } = await localAdminSupabase
      .from('purchaseorder')
      .select('id, status')
      .eq('id', purchaseorderid)
      .single();

    if (poFetchError) {
      console.error("API Route - Error fetching purchase order:", poFetchError);
      console.warn("Warning: Receiving report created but could not fetch PO for status update. PO ID:", purchaseorderid);
    } else if (purchaseOrder && purchaseOrderMaterials) {
      // Fetch all receiving reports for this PO (including the one we just created) to calculate total received
      const { data: allReceivingReports, error: rrFetchError } = await localAdminSupabase
        .from('receivingreport')
        .select(`
          id,
          receivingreportitem (
            rawmaterialid,
            quantity
          )
        `)
        .eq('purchaseorderid', purchaseorderid);

      if (rrFetchError) {
        console.error("API Route - Error fetching receiving reports:", rrFetchError);
        console.warn("Warning: Could not fetch receiving reports to calculate total received quantities.");
      } else {
        // Calculate total received quantities per material
        const totalReceived: Record<string, number> = {};
        
        if (allReceivingReports) {
          allReceivingReports.forEach((report: any) => {
            const items = report.receivingreportitem || [];
            items.forEach((item: any) => {
              const materialId = item.rawmaterialid;
              const quantity = item.quantity || 0;
              totalReceived[materialId] = (totalReceived[materialId] || 0) + quantity;
            });
          });
        }

        // Use the original expected quantities from purchaseOrderMaterials (fetched before subtraction)
        // purchaseOrderMaterials still contains the original quantities since we fetched them before updating
        const originalExpected: Record<string, number> = {};
        purchaseOrderMaterials.forEach((pom: any) => {
          const materialId = pom.rawmaterialid;
          originalExpected[materialId] = pom.quantity || 0; // Original expected quantity (before subtraction)
        });

        // Compare original expected vs total received for each material
        let allFullyReceived = true;

        for (const pom of purchaseOrderMaterials) {
          const materialId = pom.rawmaterialid;
          const expectedQty = originalExpected[materialId] || 0;
          const receivedQty = totalReceived[materialId] || 0;

          if (receivedQty < expectedQty) {
            allFullyReceived = false;
            break; // No need to check further if one is not fully received
          }
        }

        // Determine the new status - only Completed or Approved (no PartiallyDelivered)
        let newStatus: string;
        if (allFullyReceived) {
          newStatus = 'Completed';
        } else {
          // Not all materials received yet, keep as Approved
          newStatus = 'Approved';
        }

        // Update purchase order status
        const { error: poUpdateError } = await localAdminSupabase
          .from('purchaseorder')
          .update({ status: newStatus })
          .eq('id', purchaseorderid);

        if (poUpdateError) {
          console.error("API Route - Error updating purchase order status:", poUpdateError);
          console.warn("Warning: Receiving report created but PO status update failed. PO ID:", purchaseorderid);
        } else {
          console.log(`API Route - Successfully updated purchase order status to '${newStatus}' for PO:`, purchaseorderid);
        }
      }
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
