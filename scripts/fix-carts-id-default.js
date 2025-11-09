const { PrismaClient } = require("@prisma/client");

async function fixCartsIdDefault() {
  console.log("🔧 Ensuring carts.id has a UUID default and is NOT NULL...");
  const prisma = new PrismaClient();
  try {
    // Ensure pgcrypto is available for gen_random_uuid
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    // Backfill any null ids defensively (shouldn't exist, but guard anyway)
    await prisma.$executeRawUnsafe(`
      UPDATE public.carts
      SET id = gen_random_uuid()
      WHERE id IS NULL;
    `);

    // Set default and not null on id
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.carts
      ALTER COLUMN id SET DEFAULT gen_random_uuid(),
      ALTER COLUMN id SET NOT NULL;
    `);

    console.log("✅ carts.id default fixed");
  } catch (e) {
    console.error("❌ Failed to fix carts.id default:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

fixCartsIdDefault();
