export type ProductionOrderStatus =
  | "Pending"
  | "Approved"
  | "InProgress"
  | "Completed"
  | "Cancelled";
export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  productId: string;
  quantity: number;
  deadline: Date;
  status: ProductionOrderStatus;
  priority: Priority;
  notes?: string;
  createdBy: string;
  assignedTo?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface CreateProductionOrderRequest {
  productId: string;
  quantity: number;
  deadline: string; // ISO date string
  priority?: Priority;
  notes?: string;
  assignedTo?: string;
}

export interface UpdateProductionOrderRequest {
  status?: ProductionOrderStatus;
  priority?: Priority;
  notes?: string;
  assignedTo?: string;
  startedAt?: string; // ISO date string
  completedAt?: string; // ISO date string
}

