export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
  bom?: { rawMaterialId: string; quantityPerUnit: number }[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  imageUrl?: string;
  isActive?: boolean;
  bom?: { rawMaterialId: string; quantityPerUnit: number }[];
}
