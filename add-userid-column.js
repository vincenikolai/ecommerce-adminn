const { PrismaClient } = require("@prisma/client");

async function addUserIdColumn() {
  console.log("🔧 Adding userId column to Order table...");

  const prisma = new PrismaClient();

  try {
    // Add userId column to Order table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Order" 
      ADD COLUMN "userId" TEXT
    `);

    console.log("✅ userId column added to Order table");
  } catch (error) {
    if (
      error.message.includes("already exists") ||
      error.message.includes("duplicate column")
    ) {
      console.log("⚠️  userId column already exists in Order table");
    } else {
      console.log("❌ Error adding userId column:", error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addUserIdColumn();

