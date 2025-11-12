'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { RawMaterial } from '@/types/raw-material';
import { Button } from '@/components/ui/button';
import { CreateRawMaterialModal } from '@/components/modals/create-raw-material-modal';
import { EditRawMaterialModal } from '@/components/modals/edit-raw-material-modal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RAW_MATERIAL_MANAGER_ROLE: UserRole = "raw_material_manager";

export default function RawMaterialManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();
  const [showCreateRawMaterialModal, setShowCreateRawMaterialModal] = useState(false); // State for create modal
  const [showEditRawMaterialModal, setShowEditRawMaterialModal] = useState(false);   // State for edit modal
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<RawMaterial | null>(null); // State for selected product to edit
  // Filters and sorting
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'stock' | 'category' | 'unitOfMeasure'>('createdAt');
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

  const fetchRawMaterials = async () => {
    // This will call the API route: /api/admin/raw-materials/list
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: sortBy,
        sortOrder: sortOrder,
      }).toString();
      const response = await fetch(`/api/admin/raw-materials/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch raw materials");
      }
      const data: RawMaterial[] = await response.json();
      setRawMaterials(data);
    } catch (error: unknown) {
      console.error("Error in fetchRawMaterials:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === RAW_MATERIAL_MANAGER_ROLE) {
      fetchRawMaterials();
    }
  }, [session, userRole, sortBy, sortOrder]);

  const handleCreateRawMaterial = async (newRawMaterial: RawMaterial) => {
    setRawMaterials((prevRawMaterials) => [...prevRawMaterials, newRawMaterial]);
    toast.success("Raw material created successfully!");
    fetchRawMaterials();
  };

  const handleEditRawMaterial = (rawMaterial: RawMaterial) => {
    setSelectedRawMaterial(rawMaterial);
    setShowEditRawMaterialModal(true);
  };

  const handleRawMaterialUpdated = (updatedRawMaterial: RawMaterial) => {
    setRawMaterials((prevRawMaterials) =>
      prevRawMaterials.map((r) => (r.id === updatedRawMaterial.id ? updatedRawMaterial : r))
    );
    toast.success("Raw material updated successfully!");
    setShowEditRawMaterialModal(false);
    setSelectedRawMaterial(null);
    fetchRawMaterials();
  };

  const handleDeleteRawMaterial = async (rawMaterialId: string) => {
    if (!window.confirm("Are you sure you want to delete this raw material?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/raw-materials/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: rawMaterialId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete raw material");
      }

      toast.success("Raw material deleted successfully!");
      setRawMaterials((prevRawMaterials) => prevRawMaterials.filter((r) => r.id !== rawMaterialId));
    } catch (error: unknown) {
      console.error("Error deleting raw material:", error);
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
    return <div className="p-6">Loading raw material data...</div>;
  }

  if (!session || userRole !== RAW_MATERIAL_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Raw Material Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Button onClick={() => setShowCreateRawMaterialModal(true)}>Add New Raw Material</Button>
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
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="unitOfMeasure">Unit of Measure</SelectItem>
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
          <p className="text-sm text-gray-600">Total Materials</p>
          <p className="text-2xl font-bold">{rawMaterials.length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <p className="text-sm text-blue-800">Low Stock (&lt;10)</p>
          <p className="text-2xl font-bold text-blue-900">
            {rawMaterials.filter(m => m.stock < 10).length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <p className="text-sm text-green-800">In Stock</p>
          <p className="text-2xl font-bold text-green-900">
            {rawMaterials.filter(m => m.stock > 0).length}
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg shadow border border-orange-200">
          <p className="text-sm text-orange-800">Out of Stock</p>
          <p className="text-2xl font-bold text-orange-900">
            {rawMaterials.filter(m => m.stock === 0).length}
          </p>
        </div>
      </div>

      {/* Raw Materials Table */}
      {rawMaterials.length === 0 ? (
        <p>No raw materials found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 border-b text-left font-semibold">Material Name</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Category</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Material Type</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Unit of Measure</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Current Stock</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Default Supplier</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Date Added</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.map((rawMaterial) => (
                <tr key={rawMaterial.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{rawMaterial.name}</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    {rawMaterial.category}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rawMaterial.materialType === 'Raw Material' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {rawMaterial.materialType || 'Raw Material'}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b">
                    {rawMaterial.unitOfMeasure}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <span className={`font-medium ${
                      rawMaterial.stock === 0 
                        ? 'text-red-600' 
                        : rawMaterial.stock < 10 
                        ? 'text-orange-600' 
                        : 'text-green-600'
                    }`}>
                      {rawMaterial.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {rawMaterial.defaultSupplier?.company_name || rawMaterial.defaultSupplier?.supplier_shop || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {formatDate(rawMaterial.createdAt)}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRawMaterial(rawMaterial)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRawMaterial(rawMaterial.id)}
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
      <CreateRawMaterialModal
        isOpen={showCreateRawMaterialModal}
        onClose={() => setShowCreateRawMaterialModal(false)}
        onRawMaterialCreated={handleCreateRawMaterial}
      />
      {selectedRawMaterial && (
        <EditRawMaterialModal
          isOpen={showEditRawMaterialModal}
          onClose={() => setShowEditRawMaterialModal(false)}
          rawMaterial={selectedRawMaterial}
          onRawMaterialUpdated={handleRawMaterialUpdated}
        />
      )}
    </div>
  );
}
