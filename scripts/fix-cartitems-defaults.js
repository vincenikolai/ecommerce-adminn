const { PrismaClient } = require("@prisma/client");

async function fixCartItemsDefaults() {
  console.log(
    "🔧 Ensuring cart_items has UUID id default and timestamp defaults..."
  );
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    // Backfill null id
    await prisma.$executeRawUnsafe(
      `UPDATE public.cart_items SET id = gen_random_uuid() WHERE id IS NULL`
    );

    // Ensure id default and not null
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.cart_items ALTER COLUMN id SET DEFAULT gen_random_uuid()`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.cart_items ALTER COLUMN id SET NOT NULL`
    );

    // Backfill timestamps
    await prisma.$executeRawUnsafe(
      `UPDATE public.cart_items SET "createdAt" = NOW() WHERE "createdAt" IS NULL`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE public.cart_items SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL`
    );

    // Defaults and NOT NULL
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.cart_items ALTER COLUMN "createdAt" SET DEFAULT NOW()`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.cart_items ALTER COLUMN "createdAt" SET NOT NULL`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.cart_items ALTER COLUMN "updatedAt" SET DEFAULT NOW()`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.cart_items ALTER COLUMN "updatedAt" SET NOT NULL`
    );

    // Trigger function and trigger to auto-update updatedAt
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.set_updatedat()
      RETURNS trigger AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updatedat_cart_items'
        ) THEN
          CREATE TRIGGER trg_set_updatedat_cart_items
          BEFORE UPDATE ON public.cart_items
          FOR EACH ROW
          EXECUTE FUNCTION public.set_updatedat();
        END IF;
      END$$;
    `);

    console.log("✅ cart_items defaults fixed");
  } catch (e) {
    console.error("❌ Failed to fix cart_items defaults:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

fixCartItemsDefaults();
