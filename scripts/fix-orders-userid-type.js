const { PrismaClient } = require("@prisma/client");

async function fixOrdersUserIdType() {
  console.log("🔧 Ensuring orders.userId is UUID type...");
  const prisma = new PrismaClient();
  try {
    // Change orders.userId to uuid if it's not already
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'userId' AND data_type <> 'uuid'
        ) THEN
          ALTER TABLE "public"."orders"
          ALTER COLUMN "userId" TYPE uuid USING NULLIF("userId", '')::uuid;
        END IF;
      END$$;
    `);
    console.log("✅ orders.userId is UUID");
  } catch (e) {
    console.error("❌ Failed to ensure orders.userId UUID:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

fixOrdersUserIdType();
