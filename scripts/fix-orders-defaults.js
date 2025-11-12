const { PrismaClient } = require("@prisma/client");

async function ensurePgcrypto(prisma) {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
}

async function fixTable(
  prisma,
  table,
  hasUpdatedAt = true,
  hasCreatedAt = true
) {
  // Backfill NULL id, set default and not null
  await prisma.$executeRawUnsafe(
    `UPDATE public.${table} SET id = gen_random_uuid() WHERE id IS NULL`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE public.${table} ALTER COLUMN id SET DEFAULT gen_random_uuid()`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE public.${table} ALTER COLUMN id SET NOT NULL`
  );

  if (hasCreatedAt) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.${table} SET "createdAt" = NOW() WHERE "createdAt" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.${table} ALTER COLUMN "createdAt" SET DEFAULT NOW()`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.${table} ALTER COLUMN "createdAt" SET NOT NULL`
    );
  }
  if (hasUpdatedAt) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.${table} SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.${table} ALTER COLUMN "updatedAt" SET DEFAULT NOW()`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.${table} ALTER COLUMN "updatedAt" SET NOT NULL`
    );
    // one trigger function shared
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.set_updatedat()
      RETURNS trigger AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    const trig = `trg_set_updatedat_${table}`;
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${trig}') THEN
          CREATE TRIGGER ${trig} BEFORE UPDATE ON public.${table}
          FOR EACH ROW EXECUTE FUNCTION public.set_updatedat();
        END IF;
      END$$;
    `);
  }
}

async function main() {
  console.log(
    "🔧 Ensuring UUID/timestamp defaults for orders and related tables..."
  );
  const prisma = new PrismaClient();
  try {
    await ensurePgcrypto(prisma);
    await fixTable(prisma, "orders", true, true);
    await fixTable(prisma, "order_items", true, true);
    await fixTable(prisma, "order_history", false, true);
    console.log("✅ Orders defaults fixed");
  } catch (e) {
    console.error("❌ Failed to fix orders defaults:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
