const https = require("https");
const http = require("http");

// Helper function to make HTTP requests
function makeRequest(url, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(jsonData);
    }

    const req = (urlObj.protocol === "https:" ? https : http).request(
      options,
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            const jsonBody = JSON.parse(body);
            resolve({ status: res.statusCode, data: jsonBody });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testHTTPAPIs() {
  console.log("🌐 Testing HTTP API endpoints...\n");
  const baseUrl = "http://localhost:3000";

  try {
    // Test 1: Get products
    console.log("1. Testing GET /api/products...");
    const productsResponse = await makeRequest(`${baseUrl}/api/products`);
    if (productsResponse.status === 200) {
      console.log(
        `   ✅ Products API working - Found ${productsResponse.data.length} products`
      );
    } else {
      console.log(
        `   ❌ Products API failed - Status: ${productsResponse.status}`
      );
      console.log(`   Response:`, productsResponse.data);
    }

    // Test 2: Get cart (this might fail without authentication)
    console.log("\n2. Testing GET /api/cart...");
    const cartResponse = await makeRequest(`${baseUrl}/api/cart`);
    if (cartResponse.status === 200) {
      console.log(
        `   ✅ Cart API working - Found cart with ${
          cartResponse.data.items?.length || 0
        } items`
      );
    } else {
      console.log(
        `   ⚠️  Cart API returned status ${cartResponse.status} (expected without auth)`
      );
    }

    // Test 3: Get orders (this might fail without authentication)
    console.log("\n3. Testing GET /api/orders...");
    const ordersResponse = await makeRequest(`${baseUrl}/api/orders`);
    if (ordersResponse.status === 200) {
      console.log(
        `   ✅ Orders API working - Found ${ordersResponse.data.length} orders`
      );
    } else {
      console.log(
        `   ⚠️  Orders API returned status ${ordersResponse.status} (expected without auth)`
      );
    }

    // Test 4: Test admin orders API
    console.log("\n4. Testing GET /api/admin/orders...");
    const adminOrdersResponse = await makeRequest(
      `${baseUrl}/api/admin/orders`
    );
    if (adminOrdersResponse.status === 200) {
      console.log(
        `   ✅ Admin Orders API working - Found ${adminOrdersResponse.data.length} orders`
      );
    } else {
      console.log(
        `   ⚠️  Admin Orders API returned status ${adminOrdersResponse.status} (expected without auth)`
      );
    }

    // Test 5: Test production orders API
    console.log("\n5. Testing GET /api/admin/production-orders...");
    const prodOrdersResponse = await makeRequest(
      `${baseUrl}/api/admin/production-orders`
    );
    if (prodOrdersResponse.status === 200) {
      console.log(
        `   ✅ Production Orders API working - Found ${prodOrdersResponse.data.length} orders`
      );
    } else {
      console.log(
        `   ⚠️  Production Orders API returned status ${prodOrdersResponse.status} (expected without auth)`
      );
    }

    // Test 6: Test bulk orders API
    console.log("\n6. Testing GET /api/admin/bulk-orders...");
    const bulkOrdersResponse = await makeRequest(
      `${baseUrl}/api/admin/bulk-orders`
    );
    if (bulkOrdersResponse.status === 200) {
      console.log(
        `   ✅ Bulk Orders API working - Found ${bulkOrdersResponse.data.length} orders`
      );
    } else {
      console.log(
        `   ⚠️  Bulk Orders API returned status ${bulkOrdersResponse.status} (expected without auth)`
      );
    }

    console.log("\n🎉 HTTP API testing completed!");
    console.log(
      "\nNote: Some APIs may return 401/403 errors without proper authentication, which is expected behavior."
    );
  } catch (error) {
    console.error("❌ HTTP API test failed:", error.message);
    console.log(
      "\nMake sure the development server is running with: npm run dev"
    );
  }
}

testHTTPAPIs();




