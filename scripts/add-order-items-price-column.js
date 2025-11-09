const { PrismaClient } = require("@prisma/client");

async function addPriceColumn() {
  console.log("🔧 Ensuring order_items.price column exists...");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'order_items'
            AND column_name = 'price'
        ) THEN
          ALTER TABLE "order_items" ADD COLUMN "price" numeric(12,2) NOT NULL DEFAULT 0;
        END IF;
      END$$;
    `);
    console.log("✅ order_items.price column is present");
  } catch (e) {
    console.error("❌ Failed to ensure order_items.price:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

addPriceColumn();
