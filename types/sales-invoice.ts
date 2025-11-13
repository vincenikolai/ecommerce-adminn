export interface SalesInvoiceItem {
  id: string;
  salesInvoiceId: string;
  productId: string | null;
  productName: string;
  productDescription: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
  };
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: any; // jsonb
  billingAddress: any; // jsonb
  paymentMethod: string;
  deliveryMethod: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  invoiceDate: string;
  dueDate: string | null;
  status: "Unpaid" | "PartiallyPaid" | "Paid" | "Overdue" | "Cancelled";
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // Eager loaded relations
  items?: SalesInvoiceItem[];
  order?: {
    id: string;
    orderNumber: string;
    status: string;
  };
}

export interface CreateSalesInvoiceRequest {
  orderId: string;
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateSalesInvoiceRequest {
  status?: "Unpaid" | "PartiallyPaid" | "Paid" | "Overdue" | "Cancelled";
  dueDate?: string;
  notes?: string;
}

