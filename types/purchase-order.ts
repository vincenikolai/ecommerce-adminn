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
  supplier?: { name: string; supplier_shop: string }; // Eager loaded supplier details
  orderDate: string;
  deliveryDate: string;
  poReferenceNumber: string;
  totalAmount?: number; // Made optional
  createdAt: string;
  updatedAt: string;
  materials?: PurchaseOrderMaterial[];
}
