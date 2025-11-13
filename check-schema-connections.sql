-- Check all foreign key relationships in the schema
-- This script verifies that all foreign keys are properly connected

-- 1. PurchaseQuotation
-- ✓ supplierId → supplier_management_items(id)

-- 2. PurchaseQuotationItem
-- ✓ purchaseQuotationId → PurchaseQuotation(id)
-- ✓ productId → products(id)

-- 3. RawMaterial
-- ✓ defaultSupplierId → supplier_management_items(id)

-- 4. SalesOrder
-- ✓ supplierId → supplier_management_items(id)

-- 5. SalesOrderMaterial
-- ✓ salesOrderId → SalesOrder(id)
-- ✓ rawMaterialId → RawMaterial(id)

-- 6. bulk_order_items
-- ✓ bulkOrderId → bulk_orders(id)
-- ✓ productId → products(id)

-- 7. cart_items
-- ✓ cartId → carts(id)
-- ✓ productId → products(id)

-- 8. deliveries
-- ✓ order_id → orders(id)
-- ✓ rider_id → riders(id)

-- 9. order_history
-- ✓ orderId → orders(id)

-- 10. order_items
-- ✓ orderId → orders(id)
-- ✓ productId → products(id)

-- 11. order_status_history
-- ✓ orderid → orders(id)

-- 12. production_orders
-- ✓ productId → products(id)

-- 13. products
-- ✓ supplierid → supplier_management_items(id)

-- 14. profiles
-- ✓ id → auth.users(id) [External reference]

-- 15. purchaseinvoice
-- ✓ supplierid → supplier_management_items(id)
-- ✓ poreference → purchaseorder(id)
-- ✓ receivingreportid → receivingreport(id)

-- 16. purchaseinvoicematerial
-- ✓ purchaseinvoiceid → purchaseinvoice(id)
-- ✓ rawmaterialid → RawMaterial(id)

-- 17. purchaseorder
-- ✓ supplierId → supplier_management_items(id)

-- 18. purchaseordermaterial
-- ✓ purchaseorderid → purchaseorder(id)
-- ✓ rawmaterialid → RawMaterial(id)

-- 19. purchasequotationmaterial
-- ✓ purchasequotationid → PurchaseQuotation(id)
-- ✓ rawmaterialid → RawMaterial(id)

-- 20. receivingreport
-- ✓ purchaseorderid → purchaseorder(id)

-- 21. receivingreportitem
-- ✓ receivingreportid → receivingreport(id)
-- ✓ rawmaterialid → RawMaterial(id)
-- ✓ purchaseordermaterialid → purchaseordermaterial(id)

-- 22. riders
-- ✓ user_id → profiles(id)

-- 23. sales_invoice_items
-- ✓ salesInvoiceId → sales_invoices(id)

-- 24. sales_invoices
-- ✓ orderId → orders(id)

-- POTENTIAL ISSUES TO CHECK:

-- 1. Case sensitivity in table names
-- Some tables use PascalCase (PurchaseQuotation, RawMaterial, SalesOrder)
-- Others use snake_case (order_items, sales_invoices)
-- PostgreSQL is case-sensitive when using quoted identifiers

-- 2. Column name case sensitivity
-- Some columns use camelCase (orderId, productId)
-- Others use snake_case (order_id, user_id)
-- Make sure foreign key column names match exactly

-- 3. Data type consistency
-- Some IDs are uuid, others are text
-- Make sure foreign key types match:
--   - orders.id is text
--   - sales_invoices.orderId is text ✓
--   - deliveries.order_id is text ✓
--   - order_items.orderId is text ✓
--   - order_history.orderId is text ✓
--   - order_status_history.orderid is text ✓

-- 4. Missing indexes on foreign keys (performance)
-- Consider adding indexes on foreign key columns for better query performance

-- 5. Missing CASCADE/SET NULL options
-- Some foreign keys might benefit from ON DELETE CASCADE or ON DELETE SET NULL

-- VERIFICATION QUERIES:

-- Check if all foreign keys exist
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- Check for orphaned records (records with foreign keys pointing to non-existent records)
-- Example for sales_invoices:
SELECT si.id, si."orderId", si."orderNumber"
FROM sales_invoices si
LEFT JOIN orders o ON si."orderId" = o.id
WHERE o.id IS NULL;

-- Check for missing foreign key constraints
-- Example: sales_invoice_items.productId should reference products(id) but doesn't have FK
-- This is intentional (productId can be null and product info is denormalized)

