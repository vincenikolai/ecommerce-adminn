export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  materialType?: string; // 'Raw Material' or 'Finished Product'
  unitOfMeasure: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
  defaultSupplierId: string | null;
  defaultSupplier?: { 
    id: string;
    company_name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    supplier_shop?: string; // Backward compatibility
  };
}
