-- Create enum types for Order Management System

-- Order Status enum
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment Method enum
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('CreditCard', 'DebitCard', 'BankTransfer', 'PayPal', 'Cash', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment Status enum
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Completed', 'Failed', 'Refunded', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Delivery Method enum
DO $$ BEGIN
    CREATE TYPE "DeliveryMethod" AS ENUM ('Standard', 'Express', 'Overnight', 'Pickup');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Delivery Status enum
DO $$ BEGIN
    CREATE TYPE "DeliveryStatus" AS ENUM ('Pending', 'Preparing', 'Shipped', 'OutForDelivery', 'Delivered', 'Failed', 'Returned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Production Order Status enum
DO $$ BEGIN
    CREATE TYPE "ProductionOrderStatus" AS ENUM ('Pending', 'Approved', 'InProgress', 'Completed', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Priority enum
DO $$ BEGIN
    CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Bulk Order Status enum
DO $$ BEGIN
    CREATE TYPE "BulkOrderStatus" AS ENUM ('Pending', 'Approved', 'Processing', 'Completed', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

