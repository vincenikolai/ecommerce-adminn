const { PrismaClient } = require("@prisma/client");

const TABLES = [
  { name: "carts", hasUpdatedAt: true, hasCreatedAt: true },
  { name: "cart_items", hasUpdatedAt: true, hasCreatedAt: true },
  { name: "orders", hasUpdatedAt: true, hasCreatedAt: true },
  { name: "order_items", hasUpdatedAt: true, hasCreatedAt: true },
  { name: "order_history", hasUpdatedAt: false, hasCreatedAt: true },
  { name: "products", hasUpdatedAt: true, hasCreatedAt: true },
  { name: "production_orders", hasUpdatedAt: true, hasCreatedAt: true },
  { name: "bulk_orders", hasUpdatedAt: true, hasCreatedAt: true },
  { name: "bulk_order_items", hasUpdatedAt: true, hasCreatedAt: true },
];

async function ensurePgcrypto(prisma) {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
}

async function ensureUuidDefault(prisma, table) {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      -- Backfill null ids if any
      EXECUTE format('UPDATE public.%I SET id = gen_random_uuid() WHERE id IS NULL', '${table}');
      -- Set default and not null
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()', '${table}');
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET NOT NULL', '${table}');
    END$$;
  `);
}

async function ensureCreatedAt(prisma, table) {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='${table}' AND column_name='createdAt'
      ) THEN
        EXECUTE format('UPDATE public.%I SET "createdAt" = NOW() WHERE "createdAt" IS NULL', '${table}');
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN "createdAt" SET DEFAULT NOW()', '${table}');
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN "createdAt" SET NOT NULL', '${table}');
      END IF;
    END$$;
  `);
}

async function ensureUpdatedAt(prisma, table) {
  const triggerName = `trg_set_updatedat_${table}`;
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='${table}' AND column_name='updatedAt'
      ) THEN
        EXECUTE format('UPDATE public.%I SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL', '${table}');
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN "updatedAt" SET DEFAULT NOW()', '${table}');
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN "updatedAt" SET NOT NULL', '${table}');
        -- trigger function
        CREATE OR REPLACE FUNCTION public.set_updatedat()
        RETURNS trigger AS $$
        BEGIN
          NEW."updatedAt" = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        -- trigger per table
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = '${triggerName}'
        ) THEN
          EXECUTE format('CREATE TRIGGER ${triggerName} BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updatedat()', '${table}');
        END IF;
      END IF;
    END$$;
  `);
}

async function harden() {
  console.log("🔧 Hardening id/createdAt/updatedAt across tables...");
  const prisma = new PrismaClient();
  try {
    await ensurePgcrypto(prisma);

    for (const t of TABLES) {
      await ensureUuidDefault(prisma, t.name);
      if (t.hasCreatedAt) {
        await ensureCreatedAt(prisma, t.name);
      }
      if (t.hasUpdatedAt) {
        await ensureUpdatedAt(prisma, t.name);
      }
    }

    console.log("✅ Audit columns hardened for all configured tables");
  } catch (e) {
    console.error("❌ Hardening failed:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

harden();
