export interface Rider {
  id: string;
  userId: string;
  cellphoneNumber: string;
  status: "Available" | "Not Available";
  createdAt: string;
  updatedAt: string;
  // Eager loaded relations
  user?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
}

export interface CreateRiderRequest {
  userId: string;
  cellphoneNumber: string;
  status?: "Available" | "Not Available";
}

export interface UpdateRiderRequest {
  cellphoneNumber?: string;
  status?: "Available" | "Not Available";
}

