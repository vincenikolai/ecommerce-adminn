const { PrismaClient } = require("@prisma/client");

async function checkConstraints() {
  console.log("🔍 Checking database constraints...");

  const prisma = new PrismaClient();

  try {
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'CartItem' 
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY tc.constraint_name, kcu.ordinal_position
    `;

    console.log("CartItem unique constraints:");
    constraints.forEach((constraint) => {
      console.log(`  ${constraint.constraint_name}: ${constraint.column_name}`);
    });
  } catch (error) {
    console.error("❌ Error checking constraints:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConstraints();

