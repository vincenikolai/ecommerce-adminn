const { PrismaClient } = require("@prisma/client");

async function renameTables() {
  console.log("🔧 Renaming tables to lowercase...");

  const prisma = new PrismaClient();

  try {
    const tableRenames = [
      { from: "Product", to: "products" },
      { from: "Cart", to: "carts" },
      { from: "CartItem", to: "cart_items" },
      { from: "Order", to: "orders" },
      { from: "OrderItem", to: "order_items" },
      { from: "OrderHistory", to: "order_history" },
      { from: "ProductionOrder", to: "production_orders" },
      { from: "BulkOrder", to: "bulk_orders" },
      { from: "BulkOrderItem", to: "bulk_order_items" },
    ];

    for (const { from, to } of tableRenames) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "${from}" RENAME TO "${to}"`
        );
        console.log(`   ✅ Renamed ${from} to ${to}`);
      } catch (error) {
        if (error.message.includes("does not exist")) {
          console.log(`   ⚠️  Table ${from} does not exist, skipping`);
        } else {
          console.log(`   ❌ Error renaming ${from}:`, error.message);
        }
      }
    }

    console.log("✅ Table renaming completed!");
  } catch (error) {
    console.error("❌ Error renaming tables:", error);
  } finally {
    await prisma.$disconnect();
  }
}

renameTables();


