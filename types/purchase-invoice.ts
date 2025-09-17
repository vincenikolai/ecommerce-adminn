import { Json } from "./supabase";
import { Supplier } from "./supplier-management";

export enum PaymentStatus {
  Unpaid = "Unpaid",
  PartiallyPaid = "Partially Paid",
  Paid = "Paid",
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  poReferenceNumber: string;
  receivingReportReferenceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  materials?: Json; // Adjust this if you create a separate line items table
  paymentTerms?: string;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  supplier?: Supplier;
  // You might want to include PurchaseOrder and ReceivingReport objects here if you need to display their details directly
}
