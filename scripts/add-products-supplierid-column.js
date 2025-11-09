const { PrismaClient } = require("@prisma/client");

async function addSupplierIdColumn() {
  console.log("🔧 Ensuring products.supplierid column exists...");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'products'
            AND column_name = 'supplierid'
        ) THEN
          ALTER TABLE "products" ADD COLUMN "supplierid" uuid;
        END IF;
      END$$;
    `);
    console.log("✅ products.supplierid column is present");
  } catch (e) {
    console.error("❌ Failed to ensure products.supplierid:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

addSupplierIdColumn();
