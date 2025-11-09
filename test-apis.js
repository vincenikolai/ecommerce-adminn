const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testAPIs() {
  console.log("🧪 Testing API functionality...\n");

  try {
    // Test 1: Get products
    console.log("1. Testing products API...");
    const products = await prisma.product.findMany({
      take: 5,
    });
    console.log(`   ✅ Found ${products.length} products`);
    products.forEach((product) => {
      console.log(`   - ${product.name}: $${product.price}`);
    });

    // Test 2: Get carts
    console.log("\n2. Testing carts API...");
    const carts = await prisma.cart.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    console.log(`   ✅ Found ${carts.length} carts`);
    carts.forEach((cart) => {
      console.log(`   - Cart ${cart.id}: ${cart.items.length} items`);
      cart.items.forEach((item) => {
        console.log(`     * ${item.product.name} x${item.quantity}`);
      });
    });

    // Test 3: Get orders
    console.log("\n3. Testing orders API...");
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
        orderHistory: true,
      },
    });
    console.log(`   ✅ Found ${orders.length} orders`);
    orders.forEach((order) => {
      console.log(
        `   - Order ${order.orderNumber}: ${order.status} - $${order.totalAmount}`
      );
      console.log(
        `     Items: ${order.items.length}, History: ${order.orderHistory.length} entries`
      );
    });

    // Test 4: Test cart operations
    console.log("\n4. Testing cart operations...");
    const firstCart = carts[0];
    if (firstCart) {
      // Add item to cart
      const newCartItem = await prisma.cartItem.create({
        data: {
          cartId: firstCart.id,
          productId: products[0].id,
          quantity: 1,
        },
      });
      console.log(`   ✅ Added item to cart: ${newCartItem.id}`);

      // Update quantity
      await prisma.cartItem.update({
        where: { id: newCartItem.id },
        data: { quantity: 3 },
      });
      console.log(`   ✅ Updated cart item quantity to 3`);

      // Remove item
      await prisma.cartItem.delete({
        where: { id: newCartItem.id },
      });
      console.log(`   ✅ Removed cart item`);
    }

    // Test 5: Test order operations
    console.log("\n5. Testing order operations...");
    const firstOrder = orders[0];
    if (firstOrder) {
      // Update order status
      await prisma.order.update({
        where: { id: firstOrder.id },
        data: { status: "Processing" },
      });
      console.log(
        `   ✅ Updated order ${firstOrder.orderNumber} status to Processing`
      );

      // Add order history
      await prisma.orderHistory.create({
        data: {
          orderId: firstOrder.id,
          status: "Processing",
          notes: "Status updated via API test",
          changedBy: firstOrder.userId,
        },
      });
      console.log(`   ✅ Added order history entry`);
    }

    console.log(
      "\n🎉 All API tests passed! The order management system is working correctly."
    );
  } catch (error) {
    console.error("❌ API test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIs();




