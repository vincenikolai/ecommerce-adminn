const { PrismaClient } = require("@prisma/client");

async function migrateSalesOrders() {
  console.log("🔧 Migrating Sales Orders from PurchaseQuotation...");

  const prisma = new PrismaClient();

  try {
    // First, check if there are any sales orders already migrated
    const { count: existingCount } = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM public."SalesOrder"
    `);
    
    if (existingCount && existingCount[0]?.count > 0) {
      console.log(`⚠️  Found ${existingCount[0].count} existing sales orders. Skipping migration to avoid duplicates.`);
      console.log("   If you want to re-migrate, please delete existing SalesOrder records first.");
      return;
    }

    // Copy PurchaseQuotation data where isOrder = TRUE to SalesOrder
    console.log("📋 Copying PurchaseQuotation records where isOrder = TRUE...");
    
    const result = await prisma.$executeRawUnsafe(`
      INSERT INTO public."SalesOrder" (id, "supplierId", "quotedPrice", "validityDate", "createdAt", "updatedAt", "isOrder")
      SELECT id, "supplierId", "quotedPrice", "validityDate", "createdAt", "updatedAt", "isOrder"
      FROM public."PurchaseQuotation"
      WHERE "isOrder" = true
      ON CONFLICT (id) DO NOTHING
    `);

    console.log(`✅ Copied sales orders from PurchaseQuotation`);

    // Copy PurchaseQuotationMaterial data to SalesOrderMaterial
    console.log("📋 Copying PurchaseQuotationMaterial records to SalesOrderMaterial...");
    
    const materialResult = await prisma.$executeRawUnsafe(`
      INSERT INTO public."SalesOrderMaterial" (id, "salesOrderId", "rawMaterialId", quantity, "createdAt", "updatedAt")
      SELECT 
        pqm.id,
        pqm."purchaseQuotationId" as "salesOrderId",
        pqm."rawMaterialId",
        pqm.quantity,
        pqm."createdAt",
        pqm."updatedAt"
      FROM public."purchasequotationmaterial" pqm
      INNER JOIN public."PurchaseQuotation" pq ON pq.id = pqm."purchaseQuotationId"
      WHERE pq."isOrder" = true
      ON CONFLICT (id) DO NOTHING
    `);

    console.log(`✅ Copied material records to SalesOrderMaterial`);

    console.log("✅ Sales order migration completed successfully!");
  } catch (error) {
    console.error("❌ Error migrating sales orders:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateSalesOrders();

