#!/usr/bin/env node

/**
 * Order Management System Test Setup Script
 *
 * This script helps verify that the order management system is properly set up
 * and all necessary components are working correctly.
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Order Management System Test Setup");
console.log("=====================================\n");

// Check if environment file exists
function checkEnvironmentFile() {
  const envFiles = [".env.local", ".env"];
  let envFile = null;

  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      envFile = file;
      break;
    }
  }

  if (!envFile) {
    console.log("❌ Environment file not found");
    console.log("   Please create .env.local with your Supabase credentials");
    console.log("   See TESTING_GUIDE.md for details\n");
    return false;
  }

  console.log(`✅ Environment file found: ${envFile}`);

  // Check for required environment variables
  const envContent = fs.readFileSync(envFile, "utf8");
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "DIRECT_URL",
  ];

  const missingVars = requiredVars.filter(
    (varName) =>
      !envContent.includes(varName) || envContent.includes(`${varName}=your_`)
  );

  if (missingVars.length > 0) {
    console.log("❌ Missing or incomplete environment variables:");
    missingVars.forEach((varName) => console.log(`   - ${varName}`));
    console.log("   Please update your environment file with actual values\n");
    return false;
  }

  console.log("✅ All required environment variables are set\n");
  return true;
}

// Check if Prisma schema is valid
function checkPrismaSchema() {
  try {
    const schemaPath = path.join(__dirname, "prisma", "schema.prisma");
    if (!fs.existsSync(schemaPath)) {
      console.log("❌ Prisma schema not found");
      return false;
    }

    const schemaContent = fs.readFileSync(schemaPath, "utf8");

    // Check for required models
    const requiredModels = [
      "Product",
      "Cart",
      "CartItem",
      "Order",
      "OrderItem",
      "OrderHistory",
      "ProductionOrder",
      "BulkOrder",
      "BulkOrderItem",
    ];

    const missingModels = requiredModels.filter(
      (model) => !schemaContent.includes(`model ${model}`)
    );

    if (missingModels.length > 0) {
      console.log("❌ Missing models in Prisma schema:");
      missingModels.forEach((model) => console.log(`   - ${model}`));
      return false;
    }

    console.log("✅ Prisma schema contains all required models");
    return true;
  } catch (error) {
    console.log("❌ Error reading Prisma schema:", error.message);
    return false;
  }
}

// Check if API routes exist
function checkAPIRoutes() {
  const apiRoutes = [
    "app/api/products/route.ts",
    "app/api/cart/route.ts",
    "app/api/cart/[itemId]/route.ts",
    "app/api/orders/route.ts",
    "app/api/orders/[orderId]/route.ts",
    "app/api/admin/orders/route.ts",
    "app/api/admin/orders/[orderId]/route.ts",
    "app/api/admin/production-orders/route.ts",
    "app/api/admin/bulk-orders/route.ts",
  ];

  const missingRoutes = apiRoutes.filter(
    (route) => !fs.existsSync(path.join(__dirname, route))
  );

  if (missingRoutes.length > 0) {
    console.log("❌ Missing API routes:");
    missingRoutes.forEach((route) => console.log(`   - ${route}`));
    return false;
  }

  console.log("✅ All API routes exist");
  return true;
}

// Check if UI pages exist
function checkUIPages() {
  const uiPages = [
    "app/cart/page.tsx",
    "app/checkout/page.tsx",
    "app/orders/page.tsx",
    "app/orders/[orderId]/page.tsx",
    "app/dashboard/order-manager/page.tsx",
    "app/dashboard/production-manager/page.tsx",
    "app/dashboard/bulk-orders/page.tsx",
  ];

  const missingPages = uiPages.filter(
    (page) => !fs.existsSync(path.join(__dirname, page))
  );

  if (missingPages.length > 0) {
    console.log("❌ Missing UI pages:");
    missingPages.forEach((page) => console.log(`   - ${page}`));
    return false;
  }

  console.log("✅ All UI pages exist");
  return true;
}

// Check if type definitions exist
function checkTypeDefinitions() {
  const typeFiles = [
    "types/product.ts",
    "types/order.ts",
    "types/production-order.ts",
    "types/bulk-order.ts",
    "types/user.ts",
  ];

  const missingTypes = typeFiles.filter(
    (typeFile) => !fs.existsSync(path.join(__dirname, typeFile))
  );

  if (missingTypes.length > 0) {
    console.log("❌ Missing type definitions:");
    missingTypes.forEach((typeFile) => console.log(`   - ${typeFile}`));
    return false;
  }

  console.log("✅ All type definitions exist");
  return true;
}

// Main test function
function runTests() {
  console.log("Running setup tests...\n");

  const tests = [
    { name: "Environment Configuration", test: checkEnvironmentFile },
    { name: "Prisma Schema", test: checkPrismaSchema },
    { name: "API Routes", test: checkAPIRoutes },
    { name: "UI Pages", test: checkUIPages },
    { name: "Type Definitions", test: checkTypeDefinitions },
  ];

  let allPassed = true;

  tests.forEach(({ name, test }) => {
    console.log(`Testing ${name}...`);
    if (!test()) {
      allPassed = false;
    }
    console.log("");
  });

  if (allPassed) {
    console.log("🎉 All tests passed! Your order management system is ready.");
    console.log("\nNext steps:");
    console.log(
      "1. Run: npx prisma migrate dev --name add_order_management_tables"
    );
    console.log("2. Run: npm run dev");
    console.log("3. Open: http://localhost:3000");
    console.log("4. Follow the testing guide in TESTING_GUIDE.md");
  } else {
    console.log(
      "❌ Some tests failed. Please fix the issues above before proceeding."
    );
  }
}

// Run the tests
runTests();

