const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

// Sample data with proper UUIDs
const sampleProducts = [
  {
    id: uuidv4(),
    name: "All-Purpose Cleaner",
    description: "Powerful multi-surface cleaner for home and office",
    price: 12.99,
    stock: 50,
    category: "cleaning",
    imageUrl: "/cleaning products.jpg",
    isActive: true,
  },
  {
    id: uuidv4(),
    name: "Dish Soap",
    description: "Gentle yet effective dishwashing liquid",
    price: 8.99,
    stock: 75,
    category: "cleaning",
    imageUrl: "/cleaning products.jpg",
    isActive: true,
  },
  {
    id: uuidv4(),
    name: "Laundry Detergent",
    description: "High-efficiency laundry detergent for all fabric types",
    price: 15.99,
    stock: 30,
    category: "laundry",
    imageUrl: "/laundry.png",
    isActive: true,
  },
  {
    id: uuidv4(),
    name: "Office Supplies Kit",
    description: "Complete office supplies package for small businesses",
    price: 45.99,
    stock: 20,
    category: "office",
    imageUrl: "/office.jpg",
    isActive: true,
  },
  {
    id: uuidv4(),
    name: "Food Service Sanitizer",
    description: "Commercial-grade sanitizer for food service industry",
    price: 22.99,
    stock: 40,
    category: "food",
    imageUrl: "/food and bevarage.webp",
    isActive: true,
  },
];

// Store product IDs for later use
const productIds = sampleProducts.map((p) => p.id);

async function seedProducts() {
  console.log("🌱 Seeding products...");

  for (const product of sampleProducts) {
    try {
      await prisma.product.upsert({
        where: { id: product.id },
        update: product,
        create: product,
      });
      console.log(`   ✅ Product: ${product.name}`);
    } catch (error) {
      console.log(
        `   ❌ Error creating product ${product.name}:`,
        error.message
      );
    }
  }
}

async function seedUsers() {
  console.log("🌱 Seeding users...");

  const users = [
    {
      id: uuidv4(),
      role: "customer",
      first_name: "Customer",
      last_name: "One",
    },
    {
      id: uuidv4(),
      role: "customer",
      first_name: "Customer",
      last_name: "Two",
    },
    {
      id: uuidv4(),
      role: "order_manager",
      first_name: "Order",
      last_name: "Manager",
    },
    {
      id: uuidv4(),
      role: "production_manager",
      first_name: "Production",
      last_name: "Manager",
    },
    {
      id: uuidv4(),
      role: "sales_staff",
      first_name: "Sales",
      last_name: "Staff",
    },
    {
      id: uuidv4(),
      role: "admin",
      first_name: "Admin",
      last_name: "User",
      is_admin: true,
    },
  ];

  // Store user IDs for later use
  global.userIds = users.map((u) => u.id);

  for (const user of users) {
    try {
      await prisma.profile.upsert({
        where: { id: user.id },
        update: {
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          is_admin: user.is_admin || false,
        },
        create: {
          id: user.id,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          is_admin: user.is_admin || false,
        },
      });
      console.log(
        `   ✅ User: ${user.first_name} ${user.last_name} (${user.role})`
      );
    } catch (error) {
      console.log(
        `   ❌ Error creating user ${user.first_name}:`,
        error.message
      );
    }
  }
}

async function seedCarts() {
  console.log("🌱 Seeding carts...");

  const customers = [
    { id: global.userIds[0] }, // customer 1
    { id: global.userIds[1] }, // customer 2
  ];

  for (const customer of customers) {
    try {
      // Create cart
      const cart = await prisma.cart.upsert({
        where: { userId: customer.id },
        update: {},
        create: {
          userId: customer.id,
        },
      });

      // Clear existing cart items first
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Add items to cart
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productIds[0], // All-Purpose Cleaner
          quantity: 2,
        },
      });

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productIds[2], // Laundry Detergent
          quantity: 1,
        },
      });

      console.log(`   ✅ Cart for user ${customer.id} with items`);
    } catch (error) {
      console.log(
        `   ❌ Error creating cart for user ${customer.id}:`,
        error.message
      );
    }
  }
}

async function seedOrders() {
  console.log("🌱 Seeding orders...");

  const customers = [
    { id: global.userIds[0] }, // customer 1
    { id: global.userIds[1] }, // customer 2
  ];

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const orderNumber = `ORD-${Date.now()}-${i + 1}`;

    try {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          userId: customer.id,
          customerName: `Customer ${i + 1}`,
          customerEmail: `customer${i + 1}@example.com`,
          customerPhone: `+1-555-000${i + 1}`,
          shippingAddress: {
            street: `${100 + i} Main Street`,
            city: "Test City",
            state: "TS",
            zipCode: "12345",
            country: "USA",
          },
          billingAddress: {
            street: `${100 + i} Main Street`,
            city: "Test City",
            state: "TS",
            zipCode: "12345",
            country: "USA",
          },
          status: i === 0 ? "Pending" : i === 1 ? "Confirmed" : "Processing",
          paymentMethod: "CreditCard",
          paymentStatus: "Pending",
          deliveryMethod: "Standard",
          deliveryStatus: "Pending",
          totalAmount: 25.98 + i * 10,
          taxAmount: 2.6 + i * 1,
          shippingAmount: 5.0,
          notes: `Test order ${i + 1}`,
          items: {
            create: [
              {
                productId: productIds[0], // All-Purpose Cleaner
                quantity: 2,
                unitPrice: 12.99,
                totalPrice: 25.98,
              },
            ],
          },
        },
      });

      // Create order history
      await prisma.orderHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          notes: "Order created",
          changedBy: customer.id,
        },
      });

      console.log(`   ✅ Order: ${orderNumber} for user ${customer.id}`);
    } catch (error) {
      console.log(
        `   ❌ Error creating order for user ${customer.id}:`,
        error.message
      );
    }
  }
}

async function main() {
  console.log("🚀 Starting final working database seeding...\n");

  try {
    await seedProducts();
    console.log("");

    await seedUsers();
    console.log("");

    await seedCarts();
    console.log("");

    await seedOrders();
    console.log("");

    console.log("✅ Database seeding completed successfully!");
    console.log(
      "\nYou can now test the system with the following test accounts:"
    );
    console.log("👤 Customer 1:", global.userIds[0]);
    console.log("👤 Customer 2:", global.userIds[1]);
    console.log("👨‍💼 Order Manager:", global.userIds[2]);
    console.log("🏭 Production Manager:", global.userIds[3]);
    console.log("💼 Sales Staff:", global.userIds[4]);
    console.log("👑 Admin:", global.userIds[5]);
    console.log("\nNote: These are test accounts for development only.");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
main();

