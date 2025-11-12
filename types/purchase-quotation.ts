export interface PurchaseQuotationMaterial {
  id: string;
  purchaseQuotationId: string;
  rawMaterialId: string;
  rawMaterial?: RawMaterial; // Added for eager loading
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseQuotation {
  id: string;
  supplierId: string | null;
  supplier?: { name: string; supplier_shop: string }; // Optional to include supplier details
  quotedPrice: number;
  validityDate: string;
  isOrder: boolean; // Changed back from isorder
  createdAt: string; // Changed back from createdat
  updatedAt: string; // Changed back from updatedat
  materials?: PurchaseQuotationMaterial[]; // Optional to include material details
  // You might want to add a reference to the PurchaseOrder if it has been converted
  // purchaseOrderId?: string; 
}
