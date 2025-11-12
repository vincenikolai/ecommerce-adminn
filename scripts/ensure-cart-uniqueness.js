const { PrismaClient } = require("@prisma/client");

async function ensureCartUniqueness() {
  console.log("🔧 Ensuring one cart per user (unique carts.userId)...");
  const prisma = new PrismaClient();
  try {
    // Remove duplicates, keep the most recent cart
    await prisma.$executeRawUnsafe(`
      WITH ranked AS (
        SELECT id, "userId",
               ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST) AS rn
        FROM public.carts
      )
      DELETE FROM public.carts c
      USING ranked r
      WHERE c.id = r.id AND r.rn > 1;
    `);

    // Add unique index
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='carts' AND indexname='carts_userid_key'
        ) THEN
          CREATE UNIQUE INDEX carts_userid_key ON public.carts ("userId");
        END IF;
      END$$;
    `);
    console.log("✅ carts.userId is unique");
  } catch (e) {
    console.error("❌ Failed to ensure carts uniqueness:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

ensureCartUniqueness();
