const { PrismaClient } = require("@prisma/client");

async function fixConstraints() {
  console.log("🔧 Fixing database constraints...");

  const prisma = new PrismaClient();

  try {
    // Add unique constraint for CartItem cartId + productId
    console.log("Adding unique constraint for CartItem...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "CartItem" 
      ADD CONSTRAINT "CartItem_cartId_productId_key" 
      UNIQUE ("cartId", "productId")
    `);
    console.log("✅ CartItem unique constraint added");
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("⚠️  CartItem unique constraint already exists");
    } else {
      console.log("❌ Error adding CartItem constraint:", error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixConstraints();

