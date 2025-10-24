export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded";
export type PaymentMethod =
  | "Cash"
  | "CreditCard"
  | "DebitCard"
  | "BankTransfer"
  | "PayPal"
  | "Other";
export type PaymentStatus =
  | "Pending"
  | "Paid"
  | "Failed"
  | "Refunded"
  | "PartiallyRefunded";
export type DeliveryMethod = "Standard" | "Express" | "Overnight" | "Pickup";
export type DeliveryStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "OutForDelivery"
  | "Delivered"
  | "Failed"
  | "Returned";

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: Address;
  billingAddress?: Address;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryMethod: DeliveryMethod;
  deliveryStatus: DeliveryStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancelledReason?: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: Address;
  billingAddress?: Address;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface CancelOrderRequest {
  reason: string;
}

export interface OrderHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes?: string;
  changedBy?: string;
  changedAt: Date;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    stock: number;
  };
}

export interface Cart {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  items: CartItem[];
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

