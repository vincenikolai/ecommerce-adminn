# Stock Subtraction Verification

## ✅ Confirmed: Product Stock Subtraction Also Subtracts Raw Material Stock

### How It Works

When an order is marked as **"Completed"**, the system automatically:

1. **Subtracts Product Stock** (from `products` table)
2. **Subtracts Raw Material Stock** (from `RawMaterial` table) based on BOM

### Implementation Details

**File:** `lib/subtract-stock-on-order-completion.ts`

**Function:** `subtractStockOnOrderCompletion()`

### Step-by-Step Process

#### Step 1: Subtract Product Stock (Lines 47-86)
```typescript
// For each product in the order:
- Get current product stock
- Calculate: newStock = currentStock - orderQuantity
- Update products table: stock = newStock
```

#### Step 2: Fetch BOM Mappings (Lines 88-96)
```typescript
// Get all BOM entries for products in the order
- Query product_bom table
- Filter by product IDs in the order
- Get: product_id, raw_material_id, quantity_per_unit
```

#### Step 3: Calculate Raw Material Needs (Lines 102-118)
```typescript
// For each product in order:
  For each BOM entry for that product:
    totalNeeded = CEIL(orderQuantity × quantity_per_unit)
    Add to rawMaterialQuantities[raw_material_id]
```

**Example:**
- Order: 5 units of Product A
- BOM: Product A needs 2 units of Raw Material X per product
- Calculation: 5 × 2 = 10 units of Raw Material X needed

#### Step 4: Subtract Raw Material Stock (Lines 120-169)
```typescript
// For each raw material:
- Get current RawMaterial stock
- Calculate: newRawStock = currentRawStock - totalQuantity
- Update RawMaterial table: stock = newRawStock
```

### When It Triggers

The function is called when:
1. ✅ Admin manually sets order status to "Completed" (`/api/admin/orders/update-status`)
2. ✅ Rider marks delivery as "Delivered" (`/api/admin/deliveries/update`)
3. ✅ Rider updates delivery status via rider API (`/api/rider/deliveries/update-status`)
4. ✅ Order is updated directly (`/api/admin/orders/[orderId]`)

### Safety Features

1. **Prevents Double Subtraction**: Checks if order was already "Completed" before subtracting
2. **Prevents Negative Stock**: Uses `Math.max(0, stock - quantity)` to ensure stock never goes below 0
3. **Error Handling**: Continues processing even if one product/material fails
4. **Logging**: Logs all stock changes for debugging

### Database Tables Involved

1. **`products`** - Product stock is subtracted here
2. **`product_bom`** - BOM mappings (product_id → raw_material_id, quantity_per_unit)
3. **`RawMaterial`** - Raw material stock is subtracted here
4. **`order_items`** - Order details (productId, quantity)

### Verification Checklist

- ✅ Product stock is subtracted from `products` table
- ✅ BOM is fetched from `product_bom` table
- ✅ Raw material quantities are calculated correctly (orderQuantity × quantity_per_unit)
- ✅ Raw material stock is subtracted from `RawMaterial` table
- ✅ Only happens when order status changes to "Completed"
- ✅ Prevents double subtraction
- ✅ Prevents negative stock values
- ✅ Handles errors gracefully

### Example Flow

**Order Details:**
- Order ID: `order-123`
- Product: "Laundry Detergent" (ID: `prod-1`)
- Quantity: 10 units

**BOM Configuration:**
- Product: `prod-1`
- Raw Material: "Sodium Carbonate" (ID: `rm-1`)
- Quantity per unit: 0.5 kg

**What Happens:**
1. Product stock: `prod-1` stock decreases by 10
2. Raw material calculation: 10 × 0.5 = 5 kg needed
3. Raw material stock: `rm-1` stock decreases by 5

### Console Logs

When working correctly, you'll see logs like:
```
✅ Subtracted 10 from product prod-1 (stock: 50 → 40)
✅ Subtracted 5 from raw material rm-1 (stock: 100 → 95)
✅ Successfully subtracted raw materials for 1 materials in order order-123
✅ Successfully subtracted stock for 1 products in order order-123
```

### Conclusion

✅ **VERIFIED**: When product stock is subtracted from the `products` table, the corresponding raw material stock is also automatically subtracted from the `RawMaterial` table based on the product's BOM configuration.

