export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  created_at?: string;
  // Add other product properties as needed
}
