export interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
  defaultSupplierId: string | null;
  defaultSupplier?: { name: string, supplier_shop?: string };
}
