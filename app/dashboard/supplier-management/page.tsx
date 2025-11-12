'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { SupplierManagementItem } from '@/types/supplier-management'; // Import SupplierManagementItem interface
import { Button } from '@/components/ui/button'; // Import Button component
import { CreateSupplierManagementModal } from '@/components/modals/create-supplier-management-modal'; // Renamed modal
import { EditSupplierManagementModal } from '@/components/modals/edit-supplier-management-modal'; // Renamed modal
import { Label } from '@/components/ui/label'; // Import Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components

const SUPPLIER_MANAGEMENT_MANAGER_ROLE: UserRole = "supplier_management_manager"; // Renamed role constant

export default function POManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supplierManagementItems, setSupplierManagementItems] = useState<SupplierManagementItem[]>([]); // Renamed state
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();
  const [showCreateSupplierManagementModal, setShowCreateSupplierManagementModal] = useState(false); // State for create modal
  const [showEditSupplierManagementModal, setShowEditSupplierManagementModal] = useState(false);   // State for edit modal
  const [selectedSupplierManagementItem, setSelectedSupplierManagementItem] = useState<SupplierManagementItem | null>(null); // State for selected item to edit
  const [sortBy, setSortBy] = useState<"company_name" | "createdat" | "contact_person" | "email">("company_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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
    // This will call a new API route: /api/admin/supplier-management/list
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: sortBy,
        sortOrder: sortOrder,
      }).toString();
      const response = await fetch(`/api/admin/supplier-management/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch supplier management items");
      }
      const data: SupplierManagementItem[] = await response.json(); // Changed type
      setSupplierManagementItems(data);
    } catch (error: unknown) {
      console.error("Error in fetchProducts:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === SUPPLIER_MANAGEMENT_MANAGER_ROLE) {
      fetchProducts();
    }
  }, [session, userRole, sortBy, sortOrder]);

  const handleCreateSupplierManagementItem = async (newItem: SupplierManagementItem) => { // Renamed function and parameter
    // Optimistically add the new supplier management item to the list
    setSupplierManagementItems((prevItems) => [...prevItems, newItem]);
    toast.success("Supplier management item created successfully!");
    fetchProducts(); // Re-fetch to ensure data consistency and sorting
  };

  const handleEditSupplierManagementItem = (item: SupplierManagementItem) => { // Renamed function and parameter
    setSelectedSupplierManagementItem(item);
    setShowEditSupplierManagementModal(true);
  };

  const handleSupplierManagementItemUpdated = (updatedItem: SupplierManagementItem) => { // Renamed function and parameter
    setSupplierManagementItems((prevItems) =>
      prevItems.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );
    toast.success("Supplier management item updated successfully!");
    setShowEditSupplierManagementModal(false);
    setSelectedSupplierManagementItem(null);
    fetchProducts(); // Re-fetch to ensure data consistency and sorting
  };

  const handleDeleteSupplierManagementItem = async (itemId: string) => { // Renamed function and parameter
    if (!window.confirm("Are you sure you want to delete this supplier management item?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/supplier-management/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: itemId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete supplier management item");
      }

      toast.success("Supplier management item deleted successfully!");
      setSupplierManagementItems((prevItems) => prevItems.filter((i) => i.id !== itemId));
    } catch (error: unknown) {
      console.error("Error deleting supplier management item:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading supplier management data...</div>;
  }

  if (!session || userRole !== SUPPLIER_MANAGEMENT_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Supplier Management Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Supplier Management</h1>
      <Button onClick={() => setShowCreateSupplierManagementModal(true)} className="mb-4">Add New Supplier</Button>

      <div className="flex space-x-4 mb-4">
        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select onValueChange={(value: "company_name" | "createdat" | "contact_person" | "email") => setSortBy(value)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company_name">Company Name</SelectItem>
              <SelectItem value="createdat">Date Added</SelectItem>
              <SelectItem value="contact_person">Contact Person</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Select onValueChange={(value: "asc" | "desc") => setSortOrder(value)} value={sortOrder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {supplierManagementItems.length === 0 ? (
        <p>No suppliers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr><th className="py-2 px-4 border-b text-left">Company Name</th><th className="py-2 px-4 border-b text-left">Contact Person</th><th className="py-2 px-4 border-b text-left">Email</th><th className="py-2 px-4 border-b text-left">Phone</th><th className="py-2 px-4 border-b text-left">Address</th><th className="py-2 px-4 border-b text-left">Actions</th></tr>
            </thead>
            <tbody>
              {supplierManagementItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50"><td className="py-2 px-4 border-b">{item.company_name || item.supplier_shop}</td><td className="py-2 px-4 border-b">{item.contact_person || '-'}</td><td className="py-2 px-4 border-b">{item.email || '-'}</td><td className="py-2 px-4 border-b">{item.phone || '-'}</td><td className="py-2 px-4 border-b">{item.address || '-'}</td><td className="py-2 px-4 border-b space-x-2"><Button onClick={() => handleEditSupplierManagementItem(item)}>Edit</Button><Button onClick={() => handleDeleteSupplierManagementItem(item.id)} variant="destructive">Delete</Button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CreateSupplierManagementModal // Renamed component
        isOpen={showCreateSupplierManagementModal}
        onClose={() => setShowCreateSupplierManagementModal(false)}
        onProductCreated={handleCreateSupplierManagementItem}
      />
      {selectedSupplierManagementItem && (
        <EditSupplierManagementModal // Renamed component
          isOpen={showEditSupplierManagementModal}
          onClose={() => setShowEditSupplierManagementModal(false)}
          product={selectedSupplierManagementItem}
          onProductUpdated={handleSupplierManagementItemUpdated}
        />
      )}
    </div>
  );
}
