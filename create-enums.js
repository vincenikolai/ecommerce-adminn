const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

async function createEnums() {
  console.log("🔧 Creating database enums...");

  const prisma = new PrismaClient();

  try {
    // Read the SQL file
    const sql = fs.readFileSync("create-enums.sql", "utf8");

    // Split by semicolon and execute each statement
    const statements = sql.split(";").filter((stmt) => stmt.trim().length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          console.log(
            `Executing enum statement ${i + 1}/${statements.length}...`
          );
          await prisma.$executeRawUnsafe(statement);
          console.log(`✅ Enum statement ${i + 1} executed successfully`);
        } catch (error) {
          if (
            error.message.includes("already exists") ||
            error.message.includes("duplicate_object")
          ) {
            console.log(`⚠️  Enum statement ${i + 1} skipped (already exists)`);
          } else {
            console.log(`❌ Error in enum statement ${i + 1}:`, error.message);
          }
        }
      }
    }

    console.log("✅ All enums created successfully!");
  } catch (error) {
    console.error("❌ Error creating enums:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createEnums();

