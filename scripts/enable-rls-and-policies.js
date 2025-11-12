const { PrismaClient } = require("@prisma/client");

async function enableRlsAndPolicies() {
  console.log("🔐 Enabling RLS and creating policies...");
  const prisma = new PrismaClient();
  try {
    const statements = [
      // Enable RLS per table
      'ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."order_history" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."production_orders" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."bulk_orders" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."bulk_order_items" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY',

      // Products select policy for authenticated
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='products' AND policyname='select_products_authenticated'
        ) THEN
          CREATE POLICY "select_products_authenticated"
          ON public.products
          FOR SELECT
          TO authenticated
          USING (true);
        END IF;
      END$$`,

      // Profiles: allow users to read their own profile row
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='select_own_profile'
        ) THEN
          CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT TO authenticated USING ("id"::text = auth.uid()::text);
        END IF;
      END$$`,

      // Carts policies
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='carts' AND policyname='select_own_carts'
        ) THEN
          CREATE POLICY "select_own_carts" ON public.carts FOR SELECT TO authenticated USING ("userId"::text = auth.uid()::text);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='carts' AND policyname='insert_own_carts'
        ) THEN
          CREATE POLICY "insert_own_carts" ON public.carts FOR INSERT TO authenticated WITH CHECK ("userId"::text = auth.uid()::text);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='carts' AND policyname='update_own_carts'
        ) THEN
          CREATE POLICY "update_own_carts" ON public.carts FOR UPDATE TO authenticated USING ("userId"::text = auth.uid()::text);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='carts' AND policyname='delete_own_carts'
        ) THEN
          CREATE POLICY "delete_own_carts" ON public.carts FOR DELETE TO authenticated USING ("userId"::text = auth.uid()::text);
        END IF;
      END$$`,

      // Cart items policies
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cart_items' AND policyname='select_cart_items_by_owner'
        ) THEN
          CREATE POLICY "select_cart_items_by_owner" ON public.cart_items FOR SELECT TO authenticated USING (
            EXISTS (
              SELECT 1 FROM public.carts c WHERE c.id = cart_items."cartId" AND c."userId"::text = auth.uid()::text
            )
          );
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cart_items' AND policyname='insert_cart_items_by_owner'
        ) THEN
          CREATE POLICY "insert_cart_items_by_owner" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.carts c WHERE c.id = cart_items."cartId" AND c."userId"::text = auth.uid()::text
            )
          );
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cart_items' AND policyname='update_cart_items_by_owner'
        ) THEN
          CREATE POLICY "update_cart_items_by_owner" ON public.cart_items FOR UPDATE TO authenticated USING (
            EXISTS (
              SELECT 1 FROM public.carts c WHERE c.id = cart_items."cartId" AND c."userId"::text = auth.uid()::text
            )
          );
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cart_items' AND policyname='delete_cart_items_by_owner'
        ) THEN
          CREATE POLICY "delete_cart_items_by_owner" ON public.cart_items FOR DELETE TO authenticated USING (
            EXISTS (
              SELECT 1 FROM public.carts c WHERE c.id = cart_items."cartId" AND c."userId"::text = auth.uid()::text
            )
          );
        END IF;
      END$$`,

      // Orders policies
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='select_own_orders'
        ) THEN
          CREATE POLICY "select_own_orders" ON public.orders FOR SELECT TO authenticated USING ("userId"::text = auth.uid()::text);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='insert_own_orders'
        ) THEN
          CREATE POLICY "insert_own_orders" ON public.orders FOR INSERT TO authenticated WITH CHECK ("userId"::text = auth.uid()::text);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='update_own_orders'
        ) THEN
          CREATE POLICY "update_own_orders" ON public.orders FOR UPDATE TO authenticated USING ("userId"::text = auth.uid()::text);
        END IF;
      END$$`,

      // Order items policies
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='select_order_items_by_owner'
        ) THEN
          CREATE POLICY "select_order_items_by_owner" ON public.order_items FOR SELECT TO authenticated USING (
            EXISTS (
              SELECT 1 FROM public.orders o WHERE o.id = order_items."orderId" AND o."userId"::text = auth.uid()::text
            )
          );
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='insert_order_items_by_owner'
        ) THEN
          CREATE POLICY "insert_order_items_by_owner" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.orders o WHERE o.id = order_items."orderId" AND o."userId"::text = auth.uid()::text
            )
          );
        END IF;
      END$$`,

      // Order history policies
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_history' AND policyname='select_order_history_by_owner'
        ) THEN
          CREATE POLICY "select_order_history_by_owner" ON public.order_history FOR SELECT TO authenticated USING (
            EXISTS (
              SELECT 1 FROM public.orders o WHERE o.id = order_history."orderId" AND o."userId"::text = auth.uid()::text
            )
          );
        END IF;
      END$$`,
    ];

    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }

    console.log("✅ RLS enabled and policies ensured");
  } catch (e) {
    console.error("❌ Failed to enable RLS/policies:", e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

enableRlsAndPolicies();
