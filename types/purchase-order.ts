import { RawMaterial } from './raw-material';

export interface PurchaseOrderMaterial {
  id: string;
  purchaseOrderId: string;
  rawmaterialid: string;
  quantity: number;
  unitprice: number; // Unit price at the time of order
  createdAt: string;
  updatedAt: string;
  rawMaterial?: RawMaterial; // Added for eager loading
}

export interface PurchaseOrder {
  id: string;
  purchaseQuotationId: string | null;
  supplierId: string | null;
  supplier?: { 
    id: string;
    company_name: string; 
    contact_person?: string;
    email?: string;
    phone?: string;
    supplier_shop?: string; // Backward compatibility
  }; // Eager loaded supplier details
  orderDate: string;
  deliveryDate: string;
  poReferenceNumber: string;
  status: string; // Added status field
  totalAmount?: number; // Made optional
  createdAt: string;
  updatedAt: string;
  materials?: PurchaseOrderMaterial[];
}
