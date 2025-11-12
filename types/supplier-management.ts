export interface Supplier {
  id: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdat?: string;
}

// Keep the old interface for backward compatibility during migration
export interface SupplierManagementItem extends Supplier {
  supplier_shop?: string; // Deprecated: use company_name
}
