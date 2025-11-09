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
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "stock" | "category" | "unitOfMeasure">("name");
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
    // Optimistically add the new supplier management item to the list
    setRawMaterials((prevRawMaterials) => [...prevRawMaterials, newRawMaterial]);
    toast.success("Raw material created successfully!");
    fetchRawMaterials(); // Re-fetch to ensure data consistency and sorting
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
    fetchRawMaterials(); // Re-fetch to ensure data consistency and sorting
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

  if (isLoading) {
    return <div className="p-6">Loading raw material data...</div>;
  }

  if (!session || userRole !== RAW_MATERIAL_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Raw Material Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Raw Material Management</h1>
      <Button onClick={() => setShowCreateRawMaterialModal(true)} className="mb-4">Add New Raw Material</Button>

      <div className="flex space-x-4 mb-4">
        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select onValueChange={(value: "name" | "createdAt" | "stock" | "category" | "unitOfMeasure") => setSortBy(value)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (Alphabetical)</SelectItem>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="category">Category/Type</SelectItem>
              <SelectItem value="unitOfMeasure">Unit of Measure</SelectItem>
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

      {rawMaterials.length === 0 ? (
        <p>No raw materials found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">Material Name</th>
                <th className="py-2 px-4 border-b text-left">Category/Type</th>
                <th className="py-2 px-4 border-b text-left">Unit of Measure</th>
                <th className="py-2 px-4 border-b text-left">Current Stock</th>
                <th className="py-2 px-4 border-b text-left">Default Supplier</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.map((rawMaterial) => (
                <tr key={rawMaterial.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{rawMaterial.name}</td>
                  <td className="py-2 px-4 border-b">{rawMaterial.category}</td>
                  <td className="py-2 px-4 border-b">{rawMaterial.unitOfMeasure}</td>
                  <td className="py-2 px-4 border-b">{rawMaterial.stock}</td>
                  <td className="py-2 px-4 border-b">{rawMaterial.defaultSupplier?.supplier_shop || 'N/A'}</td>
                  <td className="py-2 px-4 border-b space-x-2">
                    <Button onClick={() => handleEditRawMaterial(rawMaterial)}>Edit</Button>
                    <Button onClick={() => handleDeleteRawMaterial(rawMaterial.id)} variant="destructive">Delete</Button>
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
