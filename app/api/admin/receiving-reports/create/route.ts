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

    // Subtract received quantity from purchaseordermaterial for each received item
    // Use the FK relationship (purchaseordermaterialid) that was just inserted
    console.log(`API Route - ======= STARTING QUANTITY SUBTRACTION =======`);
    console.log(`API Route - Purchase order materials:`, JSON.stringify(purchaseOrderMaterials, null, 2));
    console.log(`API Route - Items to process:`, JSON.stringify(items, null, 2));
    
    for (const item of items) {
      console.log(`API Route - Processing item:`, item.rawmaterialid, `quantity:`, item.quantity);
      
      // Find the corresponding purchaseordermaterial record
      const pomRecord = purchaseOrderMaterials.find((pom: any) => pom.rawmaterialid === item.rawmaterialid);
      
      console.log(`API Route - Found POM record:`, pomRecord ? `ID=${pomRecord.id}, quantity=${pomRecord.quantity}` : 'NOT FOUND');
      
      if (!pomRecord) {
        console.warn(`Warning: No purchase order material record found for raw material ${item.rawmaterialid}. Cannot update expected quantity.`);
        continue;
      }

      // Fetch current quantity from database to ensure we have the latest value
      const { data: currentPOM, error: fetchPOMError } = await localAdminSupabase
        .from('purchaseordermaterial')
        .select('quantity')
        .eq('id', pomRecord.id)
        .single();

      if (fetchPOMError || !currentPOM) {
        console.error(`API Route - Error fetching current purchase order material quantity for ${item.rawmaterialid}:`, fetchPOMError);
        console.warn(`Warning: Could not fetch current quantity for material ${item.rawmaterialid}. Using in-memory value.`);
        // Fallback to in-memory value
        const currentExpectedQty = pomRecord.quantity || 0;
        const receivedQty = item.quantity || 0;
        const newExpectedQty = Math.max(0, currentExpectedQty - receivedQty);

        console.log(`API Route - [FALLBACK UPDATE] Purchase order material ${pomRecord.id} (${item.rawmaterialid}): current=${currentExpectedQty}, received=${receivedQty}, new=${newExpectedQty}`);

        const { data: updatedPOM, error: updatePOMError } = await localAdminSupabase
          .from('purchaseordermaterial')
          .update({ quantity: newExpectedQty })
          .eq('id', pomRecord.id)
          .select('quantity')
          .single();

        if (updatePOMError) {
          console.error(`API Route - ❌ Error updating purchase order material quantity for ${item.rawmaterialid}:`, updatePOMError);
          console.warn(`Warning: Receiving report created but purchase order material quantity update failed for material ${item.rawmaterialid}.`);
        } else if (updatedPOM) {
          console.log(`API Route - ✅ Successfully updated purchase order material quantity for ${item.rawmaterialid}: ${currentExpectedQty} -> ${updatedPOM.quantity} (received: ${receivedQty})`);
          
          // Verify the update actually worked
          if (updatedPOM.quantity !== newExpectedQty) {
            console.error(`API Route - ⚠️ WARNING: Update returned different value! Expected ${newExpectedQty}, got ${updatedPOM.quantity}`);
          }
        } else {
          console.error(`API Route - ❌ Update returned no data for purchase order material ${pomRecord.id}`);
        }
        continue;
      }

      // Use database value for accurate subtraction
      const currentExpectedQty = currentPOM.quantity || 0;
      const receivedQty = item.quantity || 0;
      const newExpectedQty = Math.max(0, currentExpectedQty - receivedQty); // Don't go below 0

      console.log(`API Route - [BEFORE UPDATE] Purchase order material ${pomRecord.id} (${item.rawmaterialid}): current=${currentExpectedQty}, received=${receivedQty}, new=${newExpectedQty}`);

      // Update the purchase order material quantity using RPC function for atomic operation
      const { data: rpcResult, error: rpcError } = await localAdminSupabase
        .rpc('subtract_purchase_order_material_quantity', {
          pom_id: pomRecord.id,
          qty_to_subtract: receivedQty
        });

      let updatedPOM: any = null;
      let updatePOMError: any = null;

      if (rpcError) {
        console.warn(`API Route - RPC function not available, using direct update:`, rpcError);
        // Fallback to direct update if RPC function doesn't exist
        const result = await localAdminSupabase
          .from('purchaseordermaterial')
          .update({ quantity: newExpectedQty })
          .eq('id', pomRecord.id)
          .select('quantity')
          .single();
        updatedPOM = result.data;
        updatePOMError = result.error;
      } else {
        // RPC function returned the new quantity
        updatedPOM = { quantity: rpcResult };
        updatePOMError = null;
      }

      if (updatePOMError) {
        console.error(`API Route - ❌ Error updating purchase order material quantity for ${item.rawmaterialid}:`, updatePOMError);
        console.error(`API Route - Error details:`, JSON.stringify(updatePOMError, null, 2));
        console.error(`API Route - Update parameters - ID: ${pomRecord.id}, newQuantity: ${newExpectedQty}`);
        console.warn(`Warning: Receiving report created but purchase order material quantity update failed for material ${item.rawmaterialid}.`);
      } else if (updatedPOM) {
        console.log(`API Route - ✅ Successfully updated purchase order material quantity for ${item.rawmaterialid}: ${currentExpectedQty} -> ${updatedPOM.quantity} (received: ${receivedQty})`);
        
        // Verify the update actually worked
        if (updatedPOM.quantity !== newExpectedQty) {
          console.error(`API Route - ⚠️ WARNING: Update returned different value! Expected ${newExpectedQty}, got ${updatedPOM.quantity}`);
        }
        
        // Double-check by fetching again
        const { data: verifyPOM, error: verifyError } = await localAdminSupabase
          .from('purchaseordermaterial')
          .select('*')
          .eq('id', pomRecord.id)
          .single();
          
        if (!verifyError && verifyPOM) {
          console.log(`API Route - ✅ Verified: purchase order material ${pomRecord.id} now has quantity ${verifyPOM.quantity}`);
          console.log(`API Route - Full POM record after update:`, JSON.stringify(verifyPOM, null, 2));
          if (verifyPOM.quantity !== newExpectedQty) {
            console.error(`API Route - ⚠️ CRITICAL: Verification shows different value! Expected ${newExpectedQty}, verified ${verifyPOM.quantity}`);
            console.error(`API Route - This suggests a database trigger or constraint is modifying the value!`);
          }
        } else {
          console.error(`API Route - ❌ Could not verify update:`, verifyError);
        }
      } else {
        console.error(`API Route - ❌ Update returned no data for purchase order material ${pomRecord.id}`);
      }
    }
    
    console.log(`API Route - ======= FINISHED QUANTITY SUBTRACTION =======`);

    // Calculate and update RawMaterial stock from all received quantities in receivingreportitem
    // Get all unique raw material IDs from the received items
    const uniqueMaterialIds = [...new Set(items.map(item => item.rawmaterialid))];
    
    for (const materialId of uniqueMaterialIds) {
      // Sum all received quantities for this material from all receiving reports
      const { data: allReceivedItems, error: receivedItemsError } = await localAdminSupabase
        .from('receivingreportitem')
        .select('quantity')
        .eq('rawmaterialid', materialId);

      if (receivedItemsError) {
        console.error(`API Route - Error fetching received items for material ${materialId}:`, receivedItemsError);
        console.warn(`Warning: Could not calculate stock for material ${materialId}.`);
        continue;
      }

      // Calculate total received stock for this material
      const totalReceivedStock = (allReceivedItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Update RawMaterial stock with the calculated total
      const { error: updateStockError } = await localAdminSupabase
        .from('RawMaterial')
        .update({ stock: totalReceivedStock })
        .eq('id', materialId);

      if (updateStockError) {
        console.error(`API Route - Error updating stock for raw material ${materialId}:`, updateStockError);
        console.warn(`Warning: Receiving report created but stock update failed for material ${materialId}.`);
      } else {
        console.log(`API Route - Successfully updated stock for material ${materialId} to ${totalReceivedStock} (calculated from all receiving reports)`);
      }
    }

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
        let anyPartiallyReceived = false;

        for (const pom of purchaseOrderMaterials) {
          const materialId = pom.rawmaterialid;
          const expectedQty = originalExpected[materialId] || 0;
          const receivedQty = totalReceived[materialId] || 0;

          if (receivedQty < expectedQty) {
            allFullyReceived = false;
            if (receivedQty > 0) {
              anyPartiallyReceived = true;
            }
          }
        }

        // Determine the new status
        let newStatus: string;
        if (allFullyReceived) {
          newStatus = 'Completed';
        } else if (anyPartiallyReceived) {
          newStatus = 'PartiallyDelivered';
        } else {
          // No materials received yet, keep current status
          newStatus = purchaseOrder.status || 'Approved';
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
