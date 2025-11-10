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
  defaultSupplier?: { name: string, supplier_shop?: string };
}
