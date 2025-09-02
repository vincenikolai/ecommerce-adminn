'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile } from '@/types/user';
import { Product } from '@/types/product'; // Import Product interface
import { Button } from '@/components/ui/button'; // Import Button component
import { CreateProductModal } from '@/components/modals/create-product-modal';
import { EditProductModal } from '@/components/modals/edit-product-modal';

const PURCHASE_ORDER_MANAGER_ROLE = "purchase_order_manager";

export default function POManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();
  const [showCreateProductModal, setShowCreateProductModal] = useState(false); // State for create modal
  const [showEditProductModal, setShowEditProductModal] = useState(false);   // State for edit modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); // State for selected product to edit

  useEffect(() => {
    const getSessionAndRole = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Error fetching session: " + sessionError.message);
        setIsLoading(false);
        return;
      }
      setSession(session);

      if (session?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Error fetching user role: " + profileError.message);
        } else if (profile) {
          setUserRole(profile.role);
        }
      }
      setIsLoading(false);
    };

    getSessionAndRole();
  }, [supabase.auth]);

  const fetchProducts = async () => {
    // Implement product fetching logic here, similar to fetchUsers
    // This will call a new API route: /api/admin/products/list
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/products/list");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch products");
      }
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error: unknown) {
      console.error("Error in fetchProducts:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === PURCHASE_ORDER_MANAGER_ROLE) {
      fetchProducts();
    }
  }, [session, userRole]);

  const handleCreateProduct = async (newProduct: Product) => {
    // Optimistically add the new product to the list
    setProducts((prevProducts) => [...prevProducts, newProduct]);
    toast.success("Product created successfully!");
    fetchProducts(); // Re-fetch to ensure data consistency and sorting
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowEditProductModal(true);
  };

  const handleProductUpdated = (updatedProduct: Product) => {
    setProducts((prevProducts) =>
      prevProducts.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    toast.success("Product updated successfully!");
    setShowEditProductModal(false);
    setSelectedProduct(null);
    fetchProducts(); // Re-fetch to ensure data consistency and sorting
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/products/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: productId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete product");
      }

      toast.success("Product deleted successfully!");
      setProducts((prevProducts) => prevProducts.filter((p) => p.id !== productId));
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading product data...</div>;
  }

  if (!session || userRole !== PURCHASE_ORDER_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Purchase Order Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">PO Manager - Product List</h1>
      <Button onClick={() => setShowCreateProductModal(true)} className="mb-4">Add New Product</Button>
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr><th className="py-2 px-4 border-b text-left">ID</th>
                <th className="py-2 px-4 border-b text-left">Name</th>
                <th className="py-2 px-4 border-b text-left">Description</th>
                <th className="py-2 px-4 border-b text-left">Price</th>
                <th className="py-2 px-4 border-b text-left">Stock</th>
                <th className="py-2 px-4 border-b text-left">Actions</th> {/* New Actions column */}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{product.id}</td>
                  <td className="py-2 px-4 border-b">{product.name}</td>
                  <td className="py-2 px-4 border-b">{product.description}</td>
                  <td className="py-2 px-4 border-b">{product.price}</td>
                  <td className="py-2 px-4 border-b">{product.stock}</td>
                  <td className="py-2 px-4 border-b space-x-2">
                    <Button onClick={() => handleEditProduct(product)}>Edit</Button>
                    <Button onClick={() => handleDeleteProduct(product.id)} variant="destructive">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CreateProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onProductCreated={handleCreateProduct}
      />
      {selectedProduct && (
        <EditProductModal
          isOpen={showEditProductModal}
          onClose={() => setShowEditProductModal(false)}
          product={selectedProduct}
          onProductUpdated={handleProductUpdated}
        />
      )}
    </div>
  );
}
