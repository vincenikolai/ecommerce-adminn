export interface PurchaseQuotationMaterial {
  id: string;
  purchasequotationid: string;
  rawMaterialId: string; // Changed to camelCase
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseQuotation {
  id: string;
  supplierid: string | null;
  supplier?: { name: string; supplier_shop: string }; // Optional to include supplier details
  quotedPrice: number;
  validityDate: string;
  createdAt: string;
  updatedAt: string;
  materials?: PurchaseQuotationMaterial[]; // Optional to include material details
}
