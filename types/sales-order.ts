import { RawMaterial } from './raw-material';

export interface SalesOrderMaterial {
  id: string;
  salesOrderId: string;
  rawMaterialId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  rawMaterial?: RawMaterial; // Added for eager loading
}

export interface SalesOrder {
  id: string;
  supplierId: string | null;
  supplier?: { 
    id: string;
    company_name: string; 
    contact_person?: string;
    email?: string;
    phone?: string;
    supplier_shop?: string; // Backward compatibility
  }; // Eager loaded supplier details
  quotedPrice: number;
  validityDate: string;
  isOrder: boolean;
  createdAt: string;
  updatedAt: string;
  materials?: SalesOrderMaterial[];
}

