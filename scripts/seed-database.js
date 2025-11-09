#!/usr/bin/env node

/**
 * Database Seeding Script for Order Management System
 *
 * This script populates the database with sample data for testing
 * the order management system functionality.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Sample data
const sampleProducts = [
  {
    id: "prod-1",
    name: "All-Purpose Cleaner",
    description: "Powerful multi-surface cleaner for home and office",
    price: 12.99,
    stock: 50,
    category: "cleaning",
    imageUrl: "/cleaning products.jpg",
    isActive: true,
  },
  {
    id: "prod-2",
    name: "Dish Soap",
    description: "Gentle yet effective dishwashing liquid",
    price: 8.99,
    stock: 75,
    category: "cleaning",
    imageUrl: "/cleaning products.jpg",
    isActive: true,
  },
  {
    id: "prod-3",
    name: "Laundry Detergent",
    description: "High-efficiency laundry detergent for all fabric types",
    price: 15.99,
    stock: 30,
    category: "laundry",
    imageUrl: "/laundry.png",
    isActive: true,
  },
  {
    id: "prod-4",
    name: "Office Supplies Kit",
    description: "Complete office supplies package for small businesses",
    price: 45.99,
    stock: 20,
    category: "office",
    imageUrl: "/office.jpg",
    isActive: true,
  },
  {
    id: "prod-5",
    name: "Food Service Sanitizer",
    description: "Commercial-grade sanitizer for food service industry",
    price: 22.99,
    stock: 40,
    category: "food",
    imageUrl: "/food and bevarage.webp",
    isActive: true,
  },
];

const sampleUsers = [
  {
    id: "user-customer-1",
    email: "customer1@example.com",
    role: "customer",
  },
  {
    id: "user-customer-2",
    email: "customer2@example.com",
    role: "customer",
  },
  {
    id: "user-order-manager",
    email: "ordermanager@example.com",
    role: "order_manager",
  },
  {
    id: "user-production-manager",
    email: "productionmanager@example.com",
    role: "production_manager",
  },
  {
    id: "user-sales-staff",
    email: "salesstaff@example.com",
    role: "sales_staff",
  },
  {
    id: "user-admin",
    email: "admin@example.com",
    role: "admin",
  },
];

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

  for (const user of sampleUsers) {
    try {
      await prisma.profiles.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          role: user.role,
        },
        create: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.email.split("@")[0],
          last_name: "User",
        },
      });
      console.log(`   ✅ User: ${user.email} (${user.role})`);
    } catch (error) {
      console.log(`   ❌ Error creating user ${user.email}:`, error.message);
    }
  }
}

async function seedCarts() {
  console.log("🌱 Seeding carts...");

  const customers = sampleUsers.filter((user) => user.role === "customer");

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

      // Add some items to cart
      const cartItems = [
        { productId: "prod-1", quantity: 2 },
        { productId: "prod-3", quantity: 1 },
      ];

      for (const item of cartItems) {
        await prisma.cartItem.upsert({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: item.productId,
            },
          },
          update: { quantity: item.quantity },
          create: {
            cartId: cart.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }

      console.log(
        `   ✅ Cart for ${customer.email} with ${cartItems.length} items`
      );
    } catch (error) {
      console.log(
        `   ❌ Error creating cart for ${customer.email}:`,
        error.message
      );
    }
  }
}

async function seedOrders() {
  console.log("🌱 Seeding orders...");

  const customers = sampleUsers.filter((user) => user.role === "customer");

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const orderNumber = `ORD-${Date.now()}-${i + 1}`;

    try {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerName: `${customer.email.split("@")[0]} Customer`,
          customerEmail: customer.email,
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
                productId: "prod-1",
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

      console.log(`   ✅ Order: ${orderNumber} for ${customer.email}`);
    } catch (error) {
      console.log(
        `   ❌ Error creating order for ${customer.email}:`,
        error.message
      );
    }
  }
}

async function seedProductionOrders() {
  console.log("🌱 Seeding production orders...");

  const productionManager = sampleUsers.find(
    (user) => user.role === "production_manager"
  );

  const productionOrders = [
    {
      orderNumber: "PROD-001",
      productId: "prod-1",
      quantity: 100,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: "High",
      notes: "Urgent production order for upcoming promotion",
      createdBy: productionManager.id,
    },
    {
      orderNumber: "PROD-002",
      productId: "prod-3",
      quantity: 50,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      priority: "Medium",
      notes: "Regular production order",
      createdBy: productionManager.id,
    },
  ];

  for (const order of productionOrders) {
    try {
      await prisma.productionOrder.create({
        data: order,
      });
      console.log(`   ✅ Production Order: ${order.orderNumber}`);
    } catch (error) {
      console.log(
        `   ❌ Error creating production order ${order.orderNumber}:`,
        error.message
      );
    }
  }
}

async function seedBulkOrders() {
  console.log("🌱 Seeding bulk orders...");

  const salesStaff = sampleUsers.find((user) => user.role === "sales_staff");

  const bulkOrders = [
    {
      orderNumber: "BULK-001",
      customerName: "ABC Corporation",
      customerEmail: "orders@abccorp.com",
      customerPhone: "+1-555-123-4567",
      totalQuantity: 200,
      status: "Pending",
      isBackorder: false,
      notes: "Large corporate order",
      createdBy: salesStaff.id,
      items: {
        create: [
          {
            productId: "prod-1",
            quantity: 100,
            unitPrice: 12.99,
            totalPrice: 1299.0,
            isAvailable: true,
          },
          {
            productId: "prod-2",
            quantity: 100,
            unitPrice: 8.99,
            totalPrice: 899.0,
            isAvailable: true,
          },
        ],
      },
    },
    {
      orderNumber: "BULK-002",
      customerName: "XYZ Industries",
      customerEmail: "procurement@xyzind.com",
      customerPhone: "+1-555-987-6543",
      totalQuantity: 150,
      status: "Approved",
      isBackorder: true,
      notes: "Backorder - waiting for stock",
      createdBy: salesStaff.id,
      items: {
        create: [
          {
            productId: "prod-4",
            quantity: 150,
            unitPrice: 45.99,
            totalPrice: 6898.5,
            isAvailable: false,
          },
        ],
      },
    },
  ];

  for (const order of bulkOrders) {
    try {
      await prisma.bulkOrder.create({
        data: order,
      });
      console.log(`   ✅ Bulk Order: ${order.orderNumber}`);
    } catch (error) {
      console.log(
        `   ❌ Error creating bulk order ${order.orderNumber}:`,
        error.message
      );
    }
  }
}

async function main() {
  console.log("🚀 Starting database seeding...\n");

  try {
    await seedProducts();
    console.log("");

    await seedUsers();
    console.log("");

    await seedCarts();
    console.log("");

    await seedOrders();
    console.log("");

    await seedProductionOrders();
    console.log("");

    await seedBulkOrders();
    console.log("");

    console.log("✅ Database seeding completed successfully!");
    console.log(
      "\nYou can now test the system with the following test accounts:"
    );
    console.log("👤 Customer: customer1@example.com");
    console.log("👤 Customer: customer2@example.com");
    console.log("👨‍💼 Order Manager: ordermanager@example.com");
    console.log("🏭 Production Manager: productionmanager@example.com");
    console.log("💼 Sales Staff: salesstaff@example.com");
    console.log("👑 Admin: admin@example.com");
    console.log("\nNote: These are test accounts for development only.");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
main();
