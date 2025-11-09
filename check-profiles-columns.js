const { PrismaClient } = require("@prisma/client");

async function checkProfilesColumns() {
  console.log("🔍 Checking profiles table columns...");

  const prisma = new PrismaClient();

  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profiles'
      ORDER BY ordinal_position
    `;

    console.log("Profiles table columns:");
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

checkProfilesColumns();

