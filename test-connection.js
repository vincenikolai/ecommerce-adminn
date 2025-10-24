const { PrismaClient } = require("@prisma/client");

async function testConnection() {
  console.log("🔍 Testing database connection...");

  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

  try {
    // Test basic connection
    console.log("Testing basic connection...");
    await prisma.$connect();
    console.log("✅ Database connection successful!");

    // Test a simple query
    console.log("Testing simple query...");
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Query test successful:", result);

    // Test if we can access the public schema
    console.log("Testing schema access...");
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log("✅ Schema access successful. Found tables:", tables);
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    console.error("Error details:", error.meta);

    if (error.code === "P1001") {
      console.log("\n🔧 Troubleshooting P1001 error:");
      console.log("1. Check if your Supabase project is active (not paused)");
      console.log("2. Verify the database URL is correct");
      console.log("3. Check if your IP is whitelisted in Supabase");
      console.log(
        "4. Try using the connection pooling URL instead of direct URL"
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

