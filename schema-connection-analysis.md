# Schema Connection Analysis

## ✅ All Foreign Key Relationships Are Properly Connected

### Main Relationships Verified:

1. **sales_invoices → orders** ✓
   - `sales_invoices.orderId` → `orders.id` (text → text) ✓
   - Constraint: `sales_invoices_orderid_fkey` ✓

2. **sales_invoice_items → sales_invoices** ✓
   - `sales_invoice_items.salesInvoiceId` → `sales_invoices.id` (uuid → uuid) ✓
   - Constraint: `sales_invoice_items_salesinvoiceid_fkey` ✓
   - ON DELETE CASCADE ✓

3. **deliveries → orders** ✓
   - `deliveries.order_id` → `orders.id` (text → text) ✓
   - Constraint: `deliveries_order_id_fkey` ✓
   - UNIQUE constraint on `order_id` ✓

4. **deliveries → riders** ✓
   - `deliveries.rider_id` → `riders.id` (uuid → uuid) ✓
   - Constraint: `deliveries_rider_id_fkey` ✓

5. **riders → profiles** ✓
   - `riders.user_id` → `profiles.id` (uuid → uuid) ✓
   - Constraint: `riders_user_id_fkey` ✓
   - UNIQUE constraint on `user_id` ✓

6. **order_items → orders** ✓
   - `order_items.orderId` → `orders.id` (text → text) ✓
   - Constraint: `OrderItem_orderId_fkey` ✓

7. **order_items → products** ✓
   - `order_items.productId` → `products.id` (text → text) ✓
   - Constraint: `OrderItem_productId_fkey` ✓

8. **order_history → orders** ✓
   - `order_history.orderId` → `orders.id` (text → text) ✓
   - Constraint: `OrderHistory_orderId_fkey` ✓

9. **order_status_history → orders** ✓
   - `order_status_history.orderid` → `orders.id` (text → text) ✓
   - Constraint: `order_status_history_orderid_fkey` ✓

## ⚠️ Potential Issues & Notes:

### 1. **Case Sensitivity in Table Names**
   - Some tables use **PascalCase**: `PurchaseQuotation`, `RawMaterial`, `SalesOrder`
   - Others use **snake_case**: `order_items`, `sales_invoices`, `bulk_orders`
   - **PostgreSQL is case-sensitive** when using quoted identifiers
   - **Recommendation**: Use consistent naming convention (prefer snake_case)

### 2. **Column Name Case Sensitivity**
   - Some columns use **camelCase**: `orderId`, `productId`, `invoiceNumber`
   - Others use **snake_case**: `order_id`, `user_id`, `created_at`
   - **Make sure foreign key column names match exactly** in your queries

### 3. **Data Type Consistency** ✓
   - All `orders.id` references use `text` type ✓
   - All `sales_invoices.orderId` is `text` ✓
   - All `deliveries.order_id` is `text` ✓
   - All `order_items.orderId` is `text` ✓

### 4. **Missing Foreign Key (Intentional)**
   - `sales_invoice_items.productId` → `products.id`
   - **No FK constraint** (productId is nullable)
   - **This is intentional** - product info is denormalized in invoice items
   - Product may be deleted but invoice should remain

### 5. **Missing Indexes (Performance)**
   Consider adding indexes on frequently queried foreign keys:
   - `order_items.orderId` (may already exist)
   - `order_items.productId` (may already exist)
   - `deliveries.order_id` (may already exist)
   - `deliveries.rider_id` (may already exist)

## 🔍 Verification Queries

Run these in Supabase SQL Editor to verify connections:

```sql
-- 1. Check all foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 2. Check for orphaned sales_invoices (invoices without orders)
SELECT si.id, si."invoiceNumber", si."orderId", si."orderNumber"
FROM sales_invoices si
LEFT JOIN orders o ON si."orderId" = o.id
WHERE o.id IS NULL;

-- 3. Check for orphaned sales_invoice_items (items without invoices)
SELECT sii.id, sii."salesInvoiceId"
FROM sales_invoice_items sii
LEFT JOIN sales_invoices si ON sii."salesInvoiceId" = si.id
WHERE si.id IS NULL;

-- 4. Check for orphaned deliveries (deliveries without orders)
SELECT d.id, d.order_id, d.order_number
FROM deliveries d
LEFT JOIN orders o ON d.order_id = o.id
WHERE o.id IS NULL;

-- 5. Check for orphaned deliveries (deliveries without riders)
SELECT d.id, d.order_id, d.rider_id
FROM deliveries d
LEFT JOIN riders r ON d.rider_id = r.id
WHERE r.id IS NULL;

-- 6. Check for orphaned order_items (items without orders)
SELECT oi.id, oi."orderId", oi."productId"
FROM order_items oi
LEFT JOIN orders o ON oi."orderId" = o.id
WHERE o.id IS NULL;
```

## ✅ Conclusion

**All foreign key relationships are properly connected!** The schema is well-structured with:
- Proper referential integrity
- Correct data type matching
- Appropriate CASCADE/SET NULL options where needed
- Unique constraints where necessary

The only minor issue is the mixed naming conventions (PascalCase vs snake_case), but this doesn't affect functionality as long as you use the correct case in your queries.

