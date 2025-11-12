const { PrismaClient } = require("@prisma/client");

async function createSalesOrderTable() {
  console.log("🔧 Creating SalesOrder table...");

  const prisma = new PrismaClient();

  try {
    // Create SalesOrder table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public."SalesOrder" (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplierId" uuid,
        "quotedPrice" numeric NOT NULL,
        "validityDate" date NOT NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        "isOrder" boolean NOT NULL DEFAULT true,
        CONSTRAINT "SalesOrder_pkey" PRIMARY KEY (id),
        CONSTRAINT "SalesOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public.supplier_management_items(id)
      );
    `);

    console.log("✅ SalesOrder table created successfully");

    // Create SalesOrderMaterial table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public."SalesOrderMaterial" (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        "salesOrderId" uuid NOT NULL,
        "rawMaterialId" text NOT NULL,
        quantity integer NOT NULL,
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "SalesOrderMaterial_pkey" PRIMARY KEY (id),
        CONSTRAINT "SalesOrderMaterial_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES public."SalesOrder"(id) ON DELETE CASCADE,
        CONSTRAINT "SalesOrderMaterial_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES public."RawMaterial"(id)
      );
    `);

    console.log("✅ SalesOrderMaterial table created successfully");
  } catch (error) {
    console.error("❌ Error creating SalesOrder table:", error.message);
    if (error.message.includes("already exists")) {
      console.log("⚠️  Table already exists, skipping creation");
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

createSalesOrderTable();

