export type BulkOrderStatus =
  | "Pending"
  | "Approved"
  | "Processing"
  | "Completed"
  | "Cancelled";

export interface BulkOrderItem {
  id: string;
  bulkOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isAvailable: boolean;
  reservedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
  };
}

export interface BulkOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  totalQuantity: number;
  status: BulkOrderStatus;
  isBackorder: boolean;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  items: BulkOrderItem[];
}

export interface CreateBulkOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface UpdateBulkOrderRequest {
  status?: BulkOrderStatus;
  notes?: string;
  approvedBy?: string;
  completedAt?: string; // ISO date string
}

