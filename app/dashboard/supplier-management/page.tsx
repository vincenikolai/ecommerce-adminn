'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { SupplierManagementItem } from '@/types/supplier-management';
import { Button } from '@/components/ui/button';
import { CreateSupplierManagementModal } from '@/components/modals/create-supplier-management-modal';
import { EditSupplierManagementModal } from '@/components/modals/edit-supplier-management-modal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SUPPLIER_MANAGEMENT_MANAGER_ROLE: UserRole = "supplier_management_manager";

export default function SupplierManagementPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supplierManagementItems, setSupplierManagementItems] = useState<SupplierManagementItem[]>([]);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();
  const [showCreateSupplierManagementModal, setShowCreateSupplierManagementModal] = useState(false);
  const [showEditSupplierManagementModal, setShowEditSupplierManagementModal] = useState(false);
  const [selectedSupplierManagementItem, setSelectedSupplierManagementItem] = useState<SupplierManagementItem | null>(null);
  
  // Filters and sorting
  const [sortBy, setSortBy] = useState<'createdat' | 'company_name' | 'contact_person' | 'email'>('createdat');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const fetchSuppliers = async () => {
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
      const data: SupplierManagementItem[] = await response.json();
      setSupplierManagementItems(data);
    } catch (error: unknown) {
      console.error("Error in fetchSuppliers:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === SUPPLIER_MANAGEMENT_MANAGER_ROLE) {
      fetchSuppliers();
    }
  }, [session, userRole, sortBy, sortOrder]);

  const handleCreateSupplierManagementItem = async (newItem: SupplierManagementItem) => {
    setSupplierManagementItems((prevItems) => [...prevItems, newItem]);
    toast.success("Supplier created successfully!");
    fetchSuppliers();
  };

  const handleEditSupplierManagementItem = (item: SupplierManagementItem) => {
    setSelectedSupplierManagementItem(item);
    setShowEditSupplierManagementModal(true);
  };

  const handleSupplierManagementItemUpdated = (updatedItem: SupplierManagementItem) => {
    setSupplierManagementItems((prevItems) =>
      prevItems.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );
    toast.success("Supplier updated successfully!");
    setShowEditSupplierManagementModal(false);
    setSelectedSupplierManagementItem(null);
    fetchSuppliers();
  };

  const handleDeleteSupplierManagementItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) {
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

      toast.success("Supplier deleted successfully!");
      setSupplierManagementItems((prevItems) => prevItems.filter((i) => i.id !== itemId));
    } catch (error: unknown) {
      console.error("Error deleting supplier management item:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading supplier data...</div>;
  }

  if (!session || userRole !== SUPPLIER_MANAGEMENT_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Supplier Management Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Supplier Management</h1>
        <Button onClick={() => setShowCreateSupplierManagementModal(true)}>Add New Supplier</Button>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select onValueChange={(value: any) => setSortBy(value)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdat">Date Added</SelectItem>
              <SelectItem value="company_name">Company Name</SelectItem>
              <SelectItem value="contact_person">Contact Person</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Select onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)} value={sortOrder}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-600">Total Suppliers</p>
          <p className="text-2xl font-bold">{supplierManagementItems.length}</p>
        </div>
      </div>

      {/* Suppliers Table */}
      {supplierManagementItems.length === 0 ? (
        <p>No suppliers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 border-b text-left font-semibold">Company Name</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Contact Person</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Email</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Phone</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Address</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Date Added</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplierManagementItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{item.company_name || item.supplier_shop || 'N/A'}</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    {item.contact_person || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="py-3 px-4 border-b">
                    {item.email ? (
                      <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">
                        {item.email}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-b">
                    {item.phone ? (
                      <a href={`tel:${item.phone}`} className="text-blue-600 hover:underline">
                        {item.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {item.address || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {formatDate(item.createdat)}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSupplierManagementItem(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSupplierManagementItem(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateSupplierManagementModal
        isOpen={showCreateSupplierManagementModal}
        onClose={() => setShowCreateSupplierManagementModal(false)}
        onProductCreated={handleCreateSupplierManagementItem}
      />
      {selectedSupplierManagementItem && (
        <EditSupplierManagementModal
          isOpen={showEditSupplierManagementModal}
          onClose={() => setShowEditSupplierManagementModal(false)}
          product={selectedSupplierManagementItem}
          onProductUpdated={handleSupplierManagementItemUpdated}
        />
      )}
    </div>
  );
}
