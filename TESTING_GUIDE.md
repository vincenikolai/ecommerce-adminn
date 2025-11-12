# Order Management System Testing Guide

## Prerequisites

1. **Environment Setup**: Ensure your `.env.local` file is configured with valid Supabase credentials
2. **Database Migration**: Run `npx prisma migrate dev --name add_order_management_tables`
3. **Dependencies**: Ensure all packages are installed with `npm install`

## User Roles Testing

### 1. Customer Role Testing

#### Test Customer Registration and Login

1. Navigate to `/sign-up`
2. Create a new customer account
3. Verify the user role is set to "customer" in the database
4. Login and verify access to customer features

#### Test Product Browsing

1. Navigate to `/products`
2. Verify products are displayed correctly
3. Test product filtering and search functionality
4. Verify product details are shown

#### Test Shopping Cart

1. Add products to cart
2. Navigate to `/cart`
3. Verify cart items are displayed
4. Test quantity updates
5. Test item removal
6. Verify cart persistence across sessions

#### Test Checkout Process

1. Navigate to `/checkout`
2. Fill in customer information
3. Fill in shipping and billing addresses
4. Select payment and delivery methods
5. Submit order
6. Verify order is created in database
7. Verify order confirmation page

#### Test Order Management

1. Navigate to `/orders`
2. Verify order history is displayed
3. Test order filtering and sorting
4. Test order cancellation (for pending orders)
5. Navigate to individual order details at `/orders/[orderId]`

### 2. Staff Role Testing

#### Test Staff Registration

1. Create staff accounts with different roles:
   - `order_manager`
   - `production_manager`
   - `sales_staff`
2. Verify role-based access control

#### Test Order Management (Order Manager)

1. Login as order_manager
2. Navigate to `/dashboard/order-manager`
3. Verify access to all orders
4. Test order status updates:
   - Pending → Confirmed
   - Confirmed → Processing
   - Processing → Shipped
5. Test order approval functionality
6. Test order search and filtering

#### Test Production Management (Production Manager)

1. Login as production_manager
2. Navigate to `/dashboard/production-manager`
3. Test creating production orders
4. Test production order management
5. Verify access to production order statistics
6. Test production order filtering and sorting

#### Test Bulk Orders (Sales Staff)

1. Login as sales_staff
2. Navigate to `/dashboard/bulk-orders`
3. Test creating bulk orders
4. Test bulk order management
5. Test backorder handling
6. Verify access to bulk order statistics

### 3. Admin Role Testing

#### Test Admin Access

1. Login as admin
2. Verify access to all dashboard sections
3. Test user management
4. Test system-wide order management
5. Test production order management
6. Test bulk order management

## API Testing

### Test Product API

```bash
# Get all products
curl -X GET http://localhost:3000/api/products

# Get products by category
curl -X GET "http://localhost:3000/api/products?category=cleaning"

# Search products
curl -X GET "http://localhost:3000/api/products?search=soap"
```

### Test Cart API

```bash
# Add item to cart (requires authentication)
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{"productId": "product-id", "quantity": 2}'

# Get cart items
curl -X GET http://localhost:3000/api/cart

# Update cart item
curl -X PATCH http://localhost:3000/api/cart/item-id \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}'

# Remove cart item
curl -X DELETE http://localhost:3000/api/cart/item-id
```

### Test Order API

```bash
# Create order (requires authentication)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "shippingAddress": {...},
    "items": [...]
  }'

# Get user orders
curl -X GET http://localhost:3000/api/orders

# Get specific order
curl -X GET http://localhost:3000/api/orders/order-id

# Cancel order
curl -X PATCH http://localhost:3000/api/orders/order-id \
  -H "Content-Type: application/json" \
  -d '{"status": "Cancelled"}'
```

### Test Admin Order API

```bash
# Get all orders (admin only)
curl -X GET http://localhost:3000/api/admin/orders

# Update order status (admin only)
curl -X PATCH http://localhost:3000/api/admin/orders/order-id \
  -H "Content-Type: application/json" \
  -d '{"status": "Confirmed"}'

# Approve order (admin only)
curl -X PUT http://localhost:3000/api/admin/orders/order-id
```

### Test Production Order API

```bash
# Create production order (admin/production_manager only)
curl -X POST http://localhost:3000/api/admin/production-orders \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-id",
    "quantity": 100,
    "deadline": "2024-12-31",
    "priority": "High"
  }'

# Get production orders
curl -X GET http://localhost:3000/api/admin/production-orders
```

### Test Bulk Order API

```bash
# Create bulk order (admin/order_manager/sales_staff only)
curl -X POST http://localhost:3000/api/admin/bulk-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Company ABC",
    "customerEmail": "orders@company.com",
    "items": [...]
  }'

# Get bulk orders
curl -X GET http://localhost:3000/api/admin/bulk-orders
```

## Database Testing

### Verify Tables Created

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'products', 'carts', 'cart_items', 'orders',
  'order_items', 'order_history', 'production_orders',
  'bulk_orders', 'bulk_order_items'
);
```

### Test Data Insertion

```sql
-- Insert test product
INSERT INTO products (id, name, description, price, stock, category, "isActive")
VALUES ('test-product-1', 'Test Product', 'Test Description', 29.99, 100, 'cleaning', true);

-- Insert test cart
INSERT INTO carts (id, "userId")
VALUES ('test-cart-1', 'test-user-1');

-- Insert test cart item
INSERT INTO cart_items (id, "cartId", "productId", quantity)
VALUES ('test-cart-item-1', 'test-cart-1', 'test-product-1', 2);
```

## Error Testing

### Test Authentication Errors

1. Try accessing protected routes without authentication
2. Try accessing admin routes with customer role
3. Try accessing production manager routes with order manager role

### Test Validation Errors

1. Try creating orders with invalid data
2. Try creating production orders with missing required fields
3. Try creating bulk orders with invalid customer information

### Test Database Constraints

1. Try creating orders with non-existent products
2. Try creating cart items with invalid quantities
3. Try updating orders with invalid status transitions

## Performance Testing

### Test Large Datasets

1. Create multiple orders and test pagination
2. Test search performance with many products
3. Test cart performance with many items

### Test Concurrent Operations

1. Test multiple users adding to cart simultaneously
2. Test order creation under load
3. Test admin operations with multiple users

## Security Testing

### Test Input Validation

1. Try SQL injection in search fields
2. Try XSS in text inputs
3. Try CSRF attacks on forms

### Test Authorization

1. Verify users can only access their own data
2. Verify role-based access is enforced
3. Verify admin functions are properly protected

## Mobile Responsiveness Testing

1. Test all pages on mobile devices
2. Test cart and checkout on mobile
3. Test admin dashboards on tablets
4. Verify touch interactions work properly

## Browser Compatibility Testing

1. Test on Chrome, Firefox, Safari, Edge
2. Test on different screen sizes
3. Test with JavaScript disabled (graceful degradation)

## Integration Testing

### Test Complete User Flows

1. Customer: Browse → Add to Cart → Checkout → View Orders
2. Staff: Login → Manage Orders → Update Status → View Reports
3. Admin: Login → Manage All Systems → View Analytics

### Test Email Notifications (if implemented)

1. Order confirmation emails
2. Status update notifications
3. Admin alerts for important events

## Monitoring and Logging

### Check Application Logs

1. Monitor API request logs
2. Check for error logs
3. Verify authentication logs

### Check Database Logs

1. Monitor query performance
2. Check for constraint violations
3. Verify data integrity

## Cleanup After Testing

### Remove Test Data

```sql
-- Clean up test data
DELETE FROM cart_items WHERE "cartId" LIKE 'test-%';
DELETE FROM carts WHERE id LIKE 'test-%';
DELETE FROM products WHERE id LIKE 'test-%';
```

### Reset Test Users

1. Remove test user accounts
2. Reset user roles if needed
3. Clear test session data

## Troubleshooting Common Issues

### Migration Issues

- Ensure database connection is working
- Check environment variables are correct
- Verify Supabase project is active

### Authentication Issues

- Check Supabase configuration
- Verify JWT tokens are valid
- Check middleware configuration

### API Issues

- Check request/response formats
- Verify error handling
- Check CORS configuration

### Database Issues

- Check foreign key constraints
- Verify data types match schema
- Check for missing indexes

## Success Criteria

The system is working correctly when:

1. ✅ All user roles can access their designated features
2. ✅ Orders can be created, updated, and cancelled
3. ✅ Cart functionality works across sessions
4. ✅ Admin can manage all aspects of the system
5. ✅ Production orders can be created and managed
6. ✅ Bulk orders can be handled properly
7. ✅ All API endpoints return correct responses
8. ✅ Database constraints are enforced
9. ✅ Authentication and authorization work properly
10. ✅ UI is responsive and user-friendly

## Next Steps After Testing

1. Fix any identified issues
2. Optimize performance based on test results
3. Add additional features based on user feedback
4. Implement monitoring and alerting
5. Create user documentation
6. Deploy to production environment

