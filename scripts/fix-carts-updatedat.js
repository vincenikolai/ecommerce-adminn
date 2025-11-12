const { PrismaClient } = require("@prisma/client");

async function fixCartsUpdatedAt() {
  console.log(
    "🔧 Ensuring carts.updatedAt has default now() and auto-update trigger..."
  );
  const prisma = new PrismaClient();
  try {
    // Backfill nulls to now()
    await prisma.$executeRawUnsafe(`
      UPDATE public.carts SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
    `);

    // Set default now() and NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.carts
      ALTER COLUMN "updatedAt" SET DEFAULT NOW(),
      ALTER COLUMN "updatedAt" SET NOT NULL;
    `);

    // Create or replace trigger function to auto-update updatedAt
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.set_updatedat()
      RETURNS trigger AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger if not exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updatedat_carts'
        ) THEN
          CREATE TRIGGER trg_set_updatedat_carts
          BEFORE UPDATE ON public.carts
          FOR EACH ROW
          EXECUTE FUNCTION public.set_updatedat();
        END IF;
      END$$;
    `);

    console.log("✅ carts.updatedAt defaults and trigger configured");
  } catch (e) {
    console.error("❌ Failed to configure carts.updatedAt:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

fixCartsUpdatedAt();
