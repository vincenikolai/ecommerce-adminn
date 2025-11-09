const { PrismaClient } = require("@prisma/client");

async function fixConstraints() {
  console.log("🔧 Fixing database constraints...");

  const prisma = new PrismaClient();

  try {
    // Add unique constraint for cart_items cartId + productId
    console.log(
      "Adding unique constraint for cart_items (cartId, productId)..."
    );
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cart_items" 
      ADD CONSTRAINT "cart_items_cartId_productId_key" 
      UNIQUE ("cartId", "productId")
    `);
    console.log("✅ cart_items unique constraint added");
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
