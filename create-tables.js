const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

async function createTables() {
  console.log("🔧 Creating database tables...");

  const prisma = new PrismaClient();

  try {
    // Read the SQL file
    const sql = fs.readFileSync("create-tables.sql", "utf8");

    // Split by semicolon and execute each statement
    const statements = sql.split(";").filter((stmt) => stmt.trim().length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await prisma.$executeRawUnsafe(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.message.includes("already exists")) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
          } else {
            console.log(`❌ Error in statement ${i + 1}:`, error.message);
          }
        }
      }
    }

    console.log("✅ All tables created successfully!");

    // Verify tables were created
    console.log("\n🔍 Verifying tables...");
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Product', 'Cart', 'CartItem', 'Order', 'OrderItem', 'OrderHistory', 'ProductionOrder', 'BulkOrder', 'BulkOrderItem')
      ORDER BY table_name
    `;

    console.log("Created tables:");
    tables.forEach((table) => console.log(`  ✅ ${table.table_name}`));
  } catch (error) {
    console.error("❌ Error creating tables:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTables();

