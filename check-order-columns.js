const { PrismaClient } = require("@prisma/client");

async function checkOrderColumns() {
  console.log("🔍 Checking Order table columns...");

  const prisma = new PrismaClient();

  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Order'
      ORDER BY ordinal_position
    `;

    console.log("Order table columns:");
    columns.forEach((column) => {
      console.log(
        `  ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`
      );
    });
  } catch (error) {
    console.error("❌ Error checking columns:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrderColumns();

