# Order Management System Setup Checklist

## Prerequisites ✅

- [ ] Node.js installed (v18 or higher)
- [ ] npm or yarn package manager
- [ ] Supabase account and project created
- [ ] Git repository initialized

## 1. Environment Setup

### Create Environment File

- [ ] Create `.env.local` file in project root
- [ ] Add Supabase configuration:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
  DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
  NEXTAUTH_URL=http://localhost:3000
  NEXTAUTH_SECRET=your_nextauth_secret_key
  ADMIN_EMAIL=eastlachemicals@gmail.com
  ```

### Get Supabase Credentials

- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Copy Project URL and anon key
- [ ] Copy service_role key (keep secret!)
- [ ] Go to Settings → Database
- [ ] Copy connection string and replace placeholders

## 2. Database Setup

### Install Dependencies

- [ ] Run `npm install` to install all packages

### Run Database Migration

- [ ] Run `npm run db:migrate` to create database tables
- [ ] Verify migration completed successfully
- [ ] Check Supabase dashboard to see new tables

### Generate Prisma Client

- [ ] Run `npm run db:generate` to generate Prisma client
- [ ] Verify no errors in generation

## 3. System Verification

### Run Setup Tests

- [ ] Run `npm run test-setup` to verify system setup
- [ ] All tests should pass before proceeding

### Seed Test Data

- [ ] Run `npm run seed` to populate database with test data
- [ ] Verify sample data was created successfully

## 4. Development Server

### Start Development Server

- [ ] Run `npm run dev` to start Next.js development server
- [ ] Open http://localhost:3000 in browser
- [ ] Verify application loads without errors

## 5. User Role Testing

### Test Customer Features

- [ ] Navigate to `/sign-up` and create customer account
- [ ] Login and verify access to customer features
- [ ] Test product browsing at `/products`
- [ ] Test cart functionality at `/cart`
- [ ] Test checkout process at `/checkout`
- [ ] Test order history at `/orders`

### Test Staff Features

- [ ] Create staff accounts with different roles:
  - [ ] Order Manager (`order_manager`)
  - [ ] Production Manager (`production_manager`)
  - [ ] Sales Staff (`sales_staff`)
- [ ] Test order management at `/dashboard/order-manager`
- [ ] Test production management at `/dashboard/production-manager`
- [ ] Test bulk orders at `/dashboard/bulk-orders`

### Test Admin Features

- [ ] Create admin account (`admin`)
- [ ] Verify access to all dashboard sections
- [ ] Test user management
- [ ] Test system-wide order management

## 6. API Testing

### Test Product API

- [ ] GET `/api/products` - List all products
- [ ] GET `/api/products?category=cleaning` - Filter by category
- [ ] GET `/api/products?search=soap` - Search products

### Test Cart API

- [ ] POST `/api/cart` - Add item to cart
- [ ] GET `/api/cart` - Get cart items
- [ ] PATCH `/api/cart/[itemId]` - Update cart item
- [ ] DELETE `/api/cart/[itemId]` - Remove cart item

### Test Order API

- [ ] POST `/api/orders` - Create order
- [ ] GET `/api/orders` - Get user orders
- [ ] GET `/api/orders/[orderId]` - Get specific order
- [ ] PATCH `/api/orders/[orderId]` - Cancel order

### Test Admin APIs

- [ ] GET `/api/admin/orders` - List all orders
- [ ] PATCH `/api/admin/orders/[orderId]` - Update order status
- [ ] POST `/api/admin/production-orders` - Create production order
- [ ] GET `/api/admin/production-orders` - List production orders
- [ ] POST `/api/admin/bulk-orders` - Create bulk order
- [ ] GET `/api/admin/bulk-orders` - List bulk orders

## 7. Database Verification

### Check Tables Created

- [ ] Verify `products` table exists
- [ ] Verify `carts` table exists
- [ ] Verify `cart_items` table exists
- [ ] Verify `orders` table exists
- [ ] Verify `order_items` table exists
- [ ] Verify `order_history` table exists
- [ ] Verify `production_orders` table exists
- [ ] Verify `bulk_orders` table exists
- [ ] Verify `bulk_order_items` table exists

### Check Sample Data

- [ ] Verify sample products were created
- [ ] Verify sample users were created
- [ ] Verify sample orders were created
- [ ] Verify sample production orders were created
- [ ] Verify sample bulk orders were created

## 8. UI/UX Testing

### Responsive Design

- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify all pages are responsive

### Browser Compatibility

- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge

### User Experience

- [ ] Verify navigation works correctly
- [ ] Verify forms validate input properly
- [ ] Verify error messages are helpful
- [ ] Verify success messages are clear
- [ ] Verify loading states are shown

## 9. Security Testing

### Authentication

- [ ] Verify users must be logged in for protected routes
- [ ] Verify role-based access control works
- [ ] Verify session management works correctly

### Input Validation

- [ ] Test SQL injection prevention
- [ ] Test XSS prevention
- [ ] Test CSRF protection

### Data Protection

- [ ] Verify sensitive data is not exposed
- [ ] Verify proper error handling
- [ ] Verify logging is appropriate

## 10. Performance Testing

### Load Testing

- [ ] Test with multiple concurrent users
- [ ] Test with large datasets
- [ ] Verify response times are acceptable

### Database Performance

- [ ] Test query performance
- [ ] Verify indexes are working
- [ ] Test pagination performance

## 11. Error Handling

### Network Errors

- [ ] Test offline behavior
- [ ] Test slow network conditions
- [ ] Test API timeout handling

### Validation Errors

- [ ] Test invalid form submissions
- [ ] Test missing required fields
- [ ] Test invalid data types

### Database Errors

- [ ] Test constraint violations
- [ ] Test foreign key violations
- [ ] Test connection errors

## 12. Cleanup and Documentation

### Cleanup Test Data

- [ ] Remove test user accounts
- [ ] Clean up test orders
- [ ] Reset database to clean state

### Documentation

- [ ] Update README.md with setup instructions
- [ ] Document API endpoints
- [ ] Create user guides
- [ ] Document deployment process

## Troubleshooting

### Common Issues

#### Migration Errors

- **Issue**: Environment variables not found
- **Solution**: Verify `.env.local` file exists and contains all required variables

#### Database Connection Errors

- **Issue**: Cannot connect to Supabase
- **Solution**: Check DATABASE_URL and DIRECT_URL are correct

#### Authentication Errors

- **Issue**: Users cannot login
- **Solution**: Verify Supabase configuration and user creation

#### API Errors

- **Issue**: API endpoints return errors
- **Solution**: Check Prisma client generation and database schema

### Getting Help

1. Check the console for error messages
2. Verify environment variables are set correctly
3. Check Supabase dashboard for database issues
4. Review the TESTING_GUIDE.md for detailed testing steps
5. Check the Prisma documentation for database issues

## Success Criteria

The system is ready for production when:

- [ ] All setup tests pass
- [ ] All user roles work correctly
- [ ] All API endpoints function properly
- [ ] Database contains all required tables
- [ ] UI is responsive and user-friendly
- [ ] Security measures are in place
- [ ] Performance is acceptable
- [ ] Error handling is robust
- [ ] Documentation is complete

## Next Steps

After completing this checklist:

1. Deploy to staging environment
2. Conduct user acceptance testing
3. Deploy to production
4. Monitor system performance
5. Gather user feedback
6. Plan future enhancements

