const { PrismaClient } = require("@prisma/client");

async function addPartiallyDeliveredStatus() {
  console.log("🔧 Adding 'PartiallyDelivered' status to PurchaseOrderStatus enum...");

  const prisma = new PrismaClient();

  try {
    // Check if the enum value already exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'PartiallyDelivered' 
        AND enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'PurchaseOrderStatus'
        )
      ) as exists;
    `;

    const result = await prisma.$queryRawUnsafe(checkQuery);
    const exists = result[0]?.exists;

    if (exists) {
      console.log("⚠️  'PartiallyDelivered' status already exists in PurchaseOrderStatus enum, skipping");
      return;
    }

    // Add the new enum value
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "public"."PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'PartiallyDelivered'`
    );

    console.log("✅ Successfully added 'PartiallyDelivered' status to PurchaseOrderStatus enum");
  } catch (error) {
    console.error("❌ Error adding 'PartiallyDelivered' status:", error.message);
    // If the error is about the value already existing, that's okay
    if (error.message.includes("already exists") || error.message.includes("duplicate")) {
      console.log("⚠️  Status already exists, continuing...");
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addPartiallyDeliveredStatus();

