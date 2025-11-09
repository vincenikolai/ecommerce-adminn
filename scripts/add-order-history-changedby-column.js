const { PrismaClient } = require("@prisma/client");

async function addChangedByColumn() {
  console.log("🔧 Ensuring order_history.changedBy column exists...");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'order_history'
            AND column_name = 'changedBy'
        ) THEN
          ALTER TABLE "order_history" ADD COLUMN "changedBy" TEXT;
        END IF;
      END$$;
    `);
    console.log("✅ order_history.changedBy column is present");
  } catch (e) {
    console.error("❌ Failed to ensure order_history.changedBy:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

addChangedByColumn();
