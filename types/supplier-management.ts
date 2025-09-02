export interface SupplierManagementItem {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  supplier_shop: string; // New field for supplier shop
  date: string; // New field for date
  created_at?: string;
  // Add other product properties as needed
}
