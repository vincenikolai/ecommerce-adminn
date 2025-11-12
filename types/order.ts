export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shippingAddress: any; // jsonb
  billingAddress: any; // jsonb
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
  paymentMethod: string;
  deliveryMethod: string;
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
}

export interface OrderStatusHistory {
  id: string;
  orderid: string;
  oldstatus: string | null;
  newstatus: string;
  changedby: string;
  changedat: string;
  notes: string | null;
}
