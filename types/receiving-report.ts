export interface ReceivingReport {
  id: string;
  purchaseorderid: string;
  receiveddate: string;
  warehouselocation: string;
  notes: string | null;
  createdat: string;
  updatedat: string;
  purchaseOrder?: { ponumber: string; supplierid: string; deliverydate: string; materials?: any[]; };
  items?: ReceivingReportItem[];
}

export interface ReceivingReportItem {
  id: string;
  receivingreportid: string;
  rawmaterialid: string;
  quantity: number;
  createdat: string;
  updatedat: string;
  rawMaterial?: { id: string; name: string; unitOfMeasure: string; };
}
