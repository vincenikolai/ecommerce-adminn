const { PrismaClient } = require("@prisma/client");

async function addUserIdColumn() {
  console.log("🔧 Adding userId column to Order table...");

  const prisma = new PrismaClient();

  try {
    // Add userId column to orders table if missing
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'orders' 
            AND column_name = 'userId'
        ) THEN
          ALTER TABLE "orders" ADD COLUMN "userId" TEXT;
        END IF;
      END$$;
    `);

    console.log("✅ userId column added to Order table");
  } catch (error) {
    if (
      error.message.includes("already exists") ||
      error.message.includes("duplicate column")
    ) {
      console.log("⚠️  userId column already exists in orders table");
    } else {
      console.log("❌ Error adding userId column:", error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addUserIdColumn();
