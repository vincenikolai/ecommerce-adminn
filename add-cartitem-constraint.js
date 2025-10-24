const { PrismaClient } = require("@prisma/client");

async function addConstraint() {
  console.log("🔧 Adding CartItem unique constraint...");

  const prisma = new PrismaClient();

  try {
    // First, let's check if there are any duplicate cartId+productId combinations
    const duplicates = await prisma.$queryRaw`
      SELECT "cartId", "productId", COUNT(*) as count
      FROM "CartItem"
      GROUP BY "cartId", "productId"
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length > 0) {
      console.log("Found duplicate CartItem entries, removing them...");
      for (const duplicate of duplicates) {
        await prisma.$executeRawUnsafe(`
          DELETE FROM "CartItem" 
          WHERE "cartId" = '${duplicate.cartId}' 
          AND "productId" = '${duplicate.productId}'
          AND "id" NOT IN (
            SELECT "id" FROM "CartItem" 
            WHERE "cartId" = '${duplicate.cartId}' 
            AND "productId" = '${duplicate.productId}'
            LIMIT 1
          )
        `);
      }
    }

    // Now add the unique constraint
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "CartItem" 
      ADD CONSTRAINT "CartItem_cartId_productId_key" 
      UNIQUE ("cartId", "productId")
    `);

    console.log("✅ CartItem unique constraint added successfully");
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

addConstraint();

