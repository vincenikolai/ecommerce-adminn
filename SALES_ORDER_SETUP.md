# Sales Order Database Setup Guide

This guide explains how to set up the new Sales Order database that copies data from PurchaseQuotation where `isOrder = TRUE`.

## Overview

The Sales Order system uses a new `SalesOrder` table that mirrors the `PurchaseQuotation` schema. When a quotation is converted to an order (isOrder = TRUE), the data is copied to the `SalesOrder` table.

## Database Schema

### SalesOrder Table
- Based on PurchaseQuotation schema
- Contains: id, supplierId, quotedPrice, validityDate, isOrder, createdAt, updatedAt
- Foreign key to supplier_management_items

### SalesOrderMaterial Table
- Links SalesOrder to RawMaterial
- Contains: id, salesOrderId, rawMaterialId, quantity, createdAt, updatedAt

## Setup Steps

### 1. Create the Tables

Run the migration script to create the tables:

```bash
node scripts/create-sales-order-table.js
```

### 2. Migrate Existing Data

Copy all existing PurchaseQuotation records where `isOrder = TRUE` to SalesOrder:

```bash
node scripts/migrate-sales-orders.js
```

This script will:
- Copy all PurchaseQuotation records where isOrder = TRUE to SalesOrder
- Copy all related PurchaseQuotationMaterial records to SalesOrderMaterial
- Skip records that already exist (prevents duplicates)

### 3. Update Prisma Client

After creating the tables, regenerate Prisma client:

```bash
npx prisma generate
```

## How It Works

1. **Conversion Process**: When a quotation is converted to a sales order:
   - A record is created in `SalesOrder` table (using the same ID as the quotation)
   - Material records are created in `SalesOrderMaterial` table
   - The `PurchaseQuotation.isOrder` flag is set to `TRUE`

2. **Data Fetching**: The Sales Order Manager page now fetches from:
   - `/api/admin/sales-orders/list` - Fetches from SalesOrder table
   - `/api/admin/sales-orders/delete` - Deletes from SalesOrder table

3. **Data Separation**: 
   - Sales Orders are stored in `SalesOrder` table
   - Purchase Orders remain in `PurchaseOrder` table
   - Quotations remain in `PurchaseQuotation` table

## API Endpoints

- `GET /api/admin/sales-orders/list` - List all sales orders
- `DELETE /api/admin/sales-orders/delete?id={id}` - Delete a sales order

## Notes

- The SalesOrder table uses the same ID as the PurchaseQuotation it was converted from
- Materials are copied with the same IDs for consistency
- The conversion process sets `isOrder = TRUE` on the quotation but doesn't delete it

