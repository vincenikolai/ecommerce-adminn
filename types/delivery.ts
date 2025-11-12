export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  riderId: string;
  deliveryDate: string;
  quantity: number;
  status: "Assigned" | "In Transit" | "Delivered" | "Failed";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Eager loaded relations
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
  };
  rider?: {
    id: string;
    cellphoneNumber: string;
    status: string;
    user?: {
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
    };
  };
}

export interface CreateDeliveryRequest {
  orderId: string;
  riderId: string;
  deliveryDate: string;
  quantity?: number;
  notes?: string;
}

export interface UpdateDeliveryRequest {
  deliveryDate?: string;
  quantity?: number;
  status?: "Assigned" | "In Transit" | "Delivered" | "Failed";
  notes?: string;
}

