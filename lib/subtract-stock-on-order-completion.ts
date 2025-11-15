import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Subtracts product stock and corresponding raw materials when an order is marked as "Completed"
 * This function ensures stock is only subtracted once, even if called multiple times
 * @param supabase - Supabase admin client
 * @param orderId - The order ID that was just marked as "Completed"
 * @param oldStatus - The previous order status (to check if it was already completed)
 * @returns Promise with success status and any errors
 */
export async function subtractStockOnOrderCompletion(
  supabase: SupabaseClient<any>,
  orderId: string,
  oldStatus?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // If order was already completed, don't subtract stock again
    if (oldStatus === 'Completed') {
      console.log(`Order ${orderId} was already completed, skipping stock subtraction`);
      return { success: true };
    }

    // Fetch order items with product details
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        "productId",
        quantity,
        product:products(
          id,
          stock
        )
      `)
      .eq('orderId', orderId);

    if (itemsError) {
      console.error(`Error fetching order items for order ${orderId}:`, itemsError);
      return { success: false, error: itemsError.message };
    }

    if (!orderItems || orderItems.length === 0) {
      console.log(`No order items found for order ${orderId}`);
      return { success: true };
    }

    // Subtract stock for each product
    const stockUpdates: Array<{ productId: string; quantity: number; newStock: number }> = [];
    const errors: string[] = [];

    for (const item of orderItems) {
      const product = item.product as any;
      if (!product) {
        console.warn(`Product not found for order item ${item.id}`);
        continue;
      }

      const currentStock = product.stock || 0;
      const quantityToSubtract = item.quantity || 0;
      const newStock = Math.max(0, currentStock - quantityToSubtract); // Ensure stock doesn't go below 0

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock: newStock,
          updatedAt: new Date().toISOString()
        })
        .eq('id', item.productId);

      if (updateError) {
        const errorMsg = `Error updating stock for product ${item.productId}: ${updateError.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      } else {
        stockUpdates.push({
          productId: item.productId,
          quantity: quantityToSubtract,
          newStock: newStock
        });
        console.log(
          `✅ Subtracted ${quantityToSubtract} from product ${item.productId} ` +
          `(stock: ${currentStock} → ${newStock})`
        );
      }
    }

    // Calculate and subtract raw materials based on BOM
    // Fetch BOM mappings for all products in the order
    const productIds = orderItems.map(item => item.productId).filter(Boolean);
    
    console.log(`[Stock Subtraction] Processing ${productIds.length} products for order ${orderId}`);
    console.log(`[Stock Subtraction] Product IDs:`, productIds);
    
    if (productIds.length > 0) {
      const { data: bomMappings, error: bomError } = await supabase
        .from('product_bom')
        .select('product_id, raw_material_id, quantity_per_unit')
        .in('product_id', productIds);

      if (bomError) {
        console.error(`❌ Error fetching BOM mappings for order ${orderId}:`, bomError);
        errors.push(`BOM fetch error: ${bomError.message}`);
        // Don't fail the whole operation if BOM fetch fails, but log it
      } else {
        console.log(`[Stock Subtraction] Found ${bomMappings?.length || 0} BOM mappings`);
        
        if (bomMappings && bomMappings.length > 0) {
          console.log(`[Stock Subtraction] BOM mappings:`, JSON.stringify(bomMappings, null, 2));
          // Calculate total raw material quantities needed
          const rawMaterialQuantities: Record<string, number> = {};

          for (const item of orderItems) {
            const productBOMs = bomMappings.filter((bom: any) => {
              // Handle both string and exact match
              const bomProductId = String(bom.product_id || '').trim();
              const itemProductId = String(item.productId || '').trim();
              return bomProductId === itemProductId;
            });
            
            console.log(`[Stock Subtraction] Product ${item.productId}: Found ${productBOMs.length} BOM entries`);
            
            for (const bom of productBOMs) {
              const rawMaterialId = bom.raw_material_id;
              const quantityPerUnit = parseFloat(bom.quantity_per_unit) || 0;
              const totalNeeded = Math.ceil(item.quantity * quantityPerUnit);

              if (!rawMaterialQuantities[rawMaterialId]) {
                rawMaterialQuantities[rawMaterialId] = 0;
              }
              rawMaterialQuantities[rawMaterialId] += totalNeeded;
              
              console.log(
                `[Stock Subtraction] Product ${item.productId}: ` +
                `Need ${totalNeeded} of raw material ${rawMaterialId} ` +
                `(${item.quantity} units × ${quantityPerUnit} per unit)`
              );
            }
          }
          
          console.log(`[Stock Subtraction] Total raw materials needed:`, rawMaterialQuantities);

          // Subtract raw materials
          const rawMaterialUpdates: Array<{ rawMaterialId: string; quantity: number; newStock: number }> = [];

          for (const [rawMaterialId, totalQuantity] of Object.entries(rawMaterialQuantities)) {
            console.log(`[Stock Subtraction] Processing raw material ${rawMaterialId}, quantity to subtract: ${totalQuantity}`);
            
            // Get current raw material stock
            const { data: rawMaterial, error: rmFetchError } = await supabase
              .from('RawMaterial')
              .select('id, stock')
              .eq('id', rawMaterialId)
              .single();

            if (rmFetchError) {
              console.error(`❌ Error fetching raw material ${rawMaterialId}:`, rmFetchError);
              console.error(`❌ Error details:`, JSON.stringify(rmFetchError, null, 2));
              errors.push(`Error fetching raw material ${rawMaterialId}: ${rmFetchError.message}`);
              continue;
            }

            if (!rawMaterial) {
              console.warn(`⚠️ Raw material ${rawMaterialId} not found in database`);
              errors.push(`Raw material ${rawMaterialId} not found`);
              continue;
            }

            const currentRawStock = rawMaterial.stock || 0;
            const newRawStock = Math.max(0, currentRawStock - totalQuantity);

            console.log(
              `[Stock Subtraction] Raw material ${rawMaterialId}: ` +
              `Current stock: ${currentRawStock}, ` +
              `Subtracting: ${totalQuantity}, ` +
              `New stock: ${newRawStock}`
            );

            // Update raw material stock - note: RawMaterial table uses "updatedAt" (capital A)
            const { data: updatedRawMaterial, error: rmUpdateError } = await supabase
              .from('RawMaterial')
              .update({
                stock: newRawStock,
                updatedAt: new Date().toISOString()
              })
              .eq('id', rawMaterialId)
              .select('id, stock, updatedAt')
              .single();

            if (rmUpdateError) {
              const errorMsg = `❌ Error updating raw material stock for ${rawMaterialId}: ${rmUpdateError.message}`;
              console.error(errorMsg);
              console.error(`❌ Update error details:`, JSON.stringify(rmUpdateError, null, 2));
              errors.push(errorMsg);
            } else {
              rawMaterialUpdates.push({
                rawMaterialId,
                quantity: totalQuantity,
                newStock: newRawStock
              });
              console.log(
                `✅ Successfully subtracted ${totalQuantity} from raw material ${rawMaterialId} ` +
                `(stock: ${currentRawStock} → ${newRawStock})`
              );
              if (updatedRawMaterial) {
                console.log(`✅ Verified update: Raw material ${rawMaterialId} now has stock: ${updatedRawMaterial.stock}`);
              }
            }
          }

          if (rawMaterialUpdates.length > 0) {
            console.log(
              `✅ Successfully subtracted raw materials for ${rawMaterialUpdates.length} materials in order ${orderId}`
            );
          } else if (Object.keys(rawMaterialQuantities).length > 0) {
            console.warn(
              `⚠️ No raw materials were updated despite ${Object.keys(rawMaterialQuantities).length} materials needing updates`
            );
          }
        } else {
          console.warn(`⚠️ No BOM mappings found for products in order ${orderId}. Raw materials will not be subtracted.`);
          console.warn(`⚠️ This is normal if products don't have BOM configured.`);
        }
      }
    } else {
      console.warn(`⚠️ No product IDs found in order ${orderId}. Cannot process BOM.`);
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Some stock updates failed: ${errors.join('; ')}`
      };
    }

    console.log(
      `✅ Successfully subtracted stock for ${stockUpdates.length} products in order ${orderId}`
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error in subtractStockOnOrderCompletion for order ${orderId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

