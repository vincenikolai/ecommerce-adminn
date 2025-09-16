export interface PurchaseOrderMaterial {
    id: string;
    purchaseorderid: string;
    rawmaterialid: string;
    quantity: number;
    unitPrice: number;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface PurchaseOrder {
    id: string;
    supplierid: { supplier_shop: string } | string; // Can be string (ID) or object with supplier_shop
    purchasequotationid?: string | null;
    deliverydate: string;
    poNumber: string;
    status: "Pending" | "Approved" | "Delivered";
    materials?: PurchaseOrderMaterial[]; // Materials associated with this PO
    createdAt: string;
    updatedAt: string;
  }
