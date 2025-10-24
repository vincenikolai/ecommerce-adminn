const { PrismaClient } = require("@prisma/client");

async function createEnums() {
  console.log("🔧 Creating database enums...");

  const prisma = new PrismaClient();

  try {
    const enums = [
      {
        name: "OrderStatus",
        values: [
          "Pending",
          "Confirmed",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Refunded",
        ],
      },
      {
        name: "PaymentMethod",
        values: [
          "CreditCard",
          "DebitCard",
          "BankTransfer",
          "PayPal",
          "Cash",
          "Other",
        ],
      },
      {
        name: "PaymentStatus",
        values: ["Pending", "Completed", "Failed", "Refunded", "Cancelled"],
      },
      {
        name: "DeliveryMethod",
        values: ["Standard", "Express", "Overnight", "Pickup"],
      },
      {
        name: "DeliveryStatus",
        values: [
          "Pending",
          "Preparing",
          "Shipped",
          "OutForDelivery",
          "Delivered",
          "Failed",
          "Returned",
        ],
      },
      {
        name: "ProductionOrderStatus",
        values: ["Pending", "Approved", "InProgress", "Completed", "Cancelled"],
      },
      {
        name: "Priority",
        values: ["Low", "Medium", "High", "Urgent"],
      },
      {
        name: "BulkOrderStatus",
        values: ["Pending", "Approved", "Processing", "Completed", "Cancelled"],
      },
    ];

    for (const enumType of enums) {
      try {
        const values = enumType.values.map((v) => `'${v}'`).join(", ");
        const sql = `CREATE TYPE "${enumType.name}" AS ENUM (${values})`;

        console.log(`Creating enum ${enumType.name}...`);
        await prisma.$executeRawUnsafe(sql);
        console.log(`✅ Created enum ${enumType.name}`);
      } catch (error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("duplicate_object")
        ) {
          console.log(`⚠️  Enum ${enumType.name} already exists, skipping`);
        } else {
          console.log(
            `❌ Error creating enum ${enumType.name}:`,
            error.message
          );
        }
      }
    }

    console.log("✅ All enums processed!");
  } catch (error) {
    console.error("❌ Error creating enums:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createEnums();

