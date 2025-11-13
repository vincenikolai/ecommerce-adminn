export interface ReceivingReport {
  id: string;
  purchaseorderid: string;
  receiveddate: string;
  warehouselocation: string;
  notes: string | null;
  createdat: string;
  updatedat: string;
  purchaseOrder?: { 
    id: string;
    poReferenceNumber: string; 
    supplierId: string; 
    deliveryDate: string; 
    materials?: any[]; 
  };
  items?: ReceivingReportItem[];
}

export interface ReceivingReportItem {
  id: string;
  receivingreportid: string;
  rawmaterialid: string;
  quantity: number;
  purchaseordermaterialid?: string | null; // FK to purchaseordermaterial
  createdat: string;
  updatedat: string;
  rawMaterial?: { id: string; name: string; unitOfMeasure: string; };
}
