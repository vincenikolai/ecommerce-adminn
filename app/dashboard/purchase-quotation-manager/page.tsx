'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PurchaseQuotation, PurchaseQuotationMaterial } from '@/types/purchase-quotation'; // We'll create this type next
import { SupplierManagementItem } from '@/types/supplier-management';
import { RawMaterial } from '@/types/raw-material';

const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager";

export default function SalesQuotationPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();

  const [salesQuotations, setSalesQuotations] = useState<PurchaseQuotation[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierManagementItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Form states for creating a new quotation
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [quotedPrice, setQuotedPrice] = useState<string>("");
  const [validityDate, setValidityDate] = useState<string>("");
  const [selectedMaterials, setSelectedMaterials] = useState<{ rawMaterialId: string; quantity: number }[]>([]);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);

  const initialFormState = {
    selectedSupplierId: null,
    quotedPrice: "",
    validityDate: "",
    selectedMaterials: [],
  };

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
    try {
      const response = await fetch("/api/admin/supplier-management/list");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch suppliers");
      }
      const data: SupplierManagementItem[] = await response.json();
      setSuppliers(data);
    } catch (error: unknown) {
      console.error("Error fetching suppliers:", error);
      toast.error("Error loading suppliers: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const response = await fetch("/api/admin/raw-materials/list");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch raw materials");
      }
      const data: RawMaterial[] = await response.json();
      setRawMaterials(data);
    } catch (error: unknown) {
      console.error("Error fetching raw materials:", error);
      toast.error("Error loading raw materials: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const fetchSalesQuotations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/purchase-quotations/list"); // We'll create this API route next
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch sales quotations");
      }
      const data: PurchaseQuotation[] = await response.json();
      setSalesQuotations(data);
    } catch (error: unknown) {
      console.error("Error fetching sales quotations:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === SALES_QUOTATION_MANAGER_ROLE) {
      fetchSuppliers();
      fetchRawMaterials();
      fetchSalesQuotations();
    }
  }, [session, userRole]);

  const handleAddMaterial = (rawMaterialId: string) => {
    setSelectedMaterials(prev => {
      const existing = prev.find(m => m.rawMaterialId === rawMaterialId);
      if (existing) {
        return prev.map(m => m.rawMaterialId === rawMaterialId ? { ...m, quantity: m.quantity + 1 } : m);
      } else {
        return [...prev, { rawMaterialId: rawMaterialId, quantity: 1 }];
      }
    });
  };

  const handleUpdateMaterialQuantity = (rawMaterialId: string, quantity: number) => {
    setSelectedMaterials(prev =>
      prev.map(m => m.rawMaterialId === rawMaterialId ? { ...m, quantity: quantity } : m)
    );
  };

  const handleRemoveMaterial = (rawMaterialId: string) => {
    setSelectedMaterials(prev => prev.filter(m => m.rawMaterialId !== rawMaterialId));
  };

  const handleEditSalesQuotation = (salesQuotation: PurchaseQuotation) => {
    setEditingQuotationId(salesQuotation.id);
    setSelectedSupplierId(salesQuotation.supplierid);
    setQuotedPrice(salesQuotation.quotedPrice.toString());
    setValidityDate(salesQuotation.validityDate.split('T')[0]); // Format date for input
    setSelectedMaterials(salesQuotation.materials || []);
  };

  const handleCancelEditSalesQuotation = () => {
    setEditingQuotationId(null);
    setSelectedSupplierId(initialFormState.selectedSupplierId);
    setQuotedPrice(initialFormState.quotedPrice);
    setValidityDate(initialFormState.validityDate);
    setSelectedMaterials(initialFormState.selectedMaterials);
  };

  const handleSubmitNewSalesQuotation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId || quotedPrice === "" || !validityDate || selectedMaterials.length === 0) {
      toast.error("Please fill in all required fields and add at least one material.");
      return;
    }

    const payload = {
      supplierId: selectedSupplierId,
      quotedPrice: parseFloat(quotedPrice),
      validityDate: validityDate,
      materials: selectedMaterials,
    };

    try {
      const url = editingQuotationId
        ? `/api/admin/purchase-quotations/update?id=${editingQuotationId}`
        : "/api/admin/purchase-quotations/create";
      const method = editingQuotationId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingQuotationId ? "update" : "create"} sales quotation`);
      }

      toast.success(`Sales quotation ${editingQuotationId ? "updated" : "created"}!`);
      // Clear form and re-fetch data
      handleCancelEditSalesQuotation(); // Use the new cancel function to clear the form
      fetchSalesQuotations();
    } catch (error: unknown) {
      console.error(`Error ${editingQuotationId ? "updating" : "creating"} sales quotation:`, error);
      toast.error(`Error ${editingQuotationId ? "updating" : "creating"} sales quotation: ` + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const handleDeleteSalesQuotation = async (salesQuotationId: string) => {
    if (!window.confirm("Are you sure you want to delete this sales quotation?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/purchase-quotations/delete?id=${salesQuotationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete sales quotation");
      }

      toast.success("Sales quotation deleted!");
      fetchSalesQuotations();
    } catch (error: unknown) {
      console.error("Error deleting sales quotation:", error);
      toast.error("Error deleting sales quotation: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading sales quotation data...</div>;
  }

  if (!session || userRole !== SALES_QUOTATION_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Sales Quotation Manager" privileges to view this page.</div>;
  }

  const getRawMaterialName = (id: string) => {
    return rawMaterials.find(rm => rm.id === id)?.name || 'Unknown Raw Material';
  };

  const getSupplierName = (id: string) => {
    return suppliers.find(s => s.id === id)?.supplier_shop || 'Unknown Supplier';
  };

  const getSalesQuotationNumber = (id: string | null | undefined) => {
    if (!id) return 'N/A';
    return salesQuotations.find(pq => pq.id === id)?.id || 'N/A';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Quotation Management</h1>

      <h2 className="text-xl font-semibold mb-4">Create New Sales Quotation</h2>
      <form onSubmit={handleSubmitNewSalesQuotation} className="grid gap-4 mb-8 p-4 border rounded-md bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="supplier">Supplier Name</Label>
            <Select onValueChange={(value) => setSelectedSupplierId(value === "none-selected" ? null : value)} value={selectedSupplierId || "none-selected"}>
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none-selected">None</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.supplier_shop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quotedPrice">Quoted Price</Label>
            <Input
              id="quotedPrice"
              type="number"
              step="0.01"
              value={quotedPrice}
              onChange={(e) => setQuotedPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="validityDate">Validity Date</Label>
            <Input
              id="validityDate"
              type="date"
              value={validityDate}
              onChange={(e) => setValidityDate(e.target.value)}
              required
            />
          </div>
        </div>

        <h3 className="text-lg font-medium mt-4 mb-2">Materials for Quotation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rawMaterial">Select Raw Material</Label>
            <Select onValueChange={handleAddMaterial} value="">
              <SelectTrigger>
                <SelectValue placeholder="Add Raw Material" />
              </SelectTrigger>
              <SelectContent>
                {rawMaterials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.name} ({material.unitOfMeasure})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          {selectedMaterials.length === 0 ? (
            <p>No materials added to this quotation.</p>
          ) : (
            <ul className="space-y-2">
              {selectedMaterials.map((material) => (
                <li key={material.rawMaterialId} className="flex items-center space-x-2">
                  <span>{getRawMaterialName(material.rawMaterialId)}</span>
                  <Input
                    type="number"
                    min="1"
                    value={material.quantity}
                    onChange={(e) => handleUpdateMaterialQuantity(material.rawMaterialId, parseInt(e.target.value, 10))}
                    className="w-20"
                  />
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveMaterial(material.rawMaterialId)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={isLoading} className="mt-4">
          {editingQuotationId ? "Update Sales Quotation" : "Create Sales Quotation"}
        </Button>
        {editingQuotationId && (
          <Button type="button" variant="outline" onClick={handleCancelEditSalesQuotation} className="mt-2">
            Cancel Edit
          </Button>
        )}
      </form>

      <h2 className="text-xl font-semibold mb-4 mt-8">Existing Sales Quotations</h2>
      {salesQuotations.length === 0 ? (
        <p>No sales quotations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">Supplier</th>
                <th className="py-2 px-4 border-b text-left">Quoted Price</th>
                <th className="py-2 px-4 border-b text-left">Validity Date</th>
                <th className="py-2 px-4 border-b text-left">Materials</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesQuotations.map((salesQuotation) => (
                <tr key={salesQuotation.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{getSupplierName(salesQuotation.supplierid || '')}</td>
                  <td className="py-2 px-4 border-b">₱{salesQuotation.quotedPrice.toFixed(2)}</td>
                  <td className="py-2 px-4 border-b">{new Date(salesQuotation.validityDate).toLocaleDateString()}</td>
                  <td className="py-2 px-4 border-b">
                    <ul className="list-disc list-inside">
                      {console.log(`PO ID: ${salesQuotation.id}, Materials:`, salesQuotation.materials)}
                      {salesQuotation.materials?.map(material => (
                        <li key={material.rawMaterialId}>
                          {getRawMaterialName(material.rawMaterialId)} x {material.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2 px-4 border-b space-x-2">
                    <Button variant="secondary" onClick={() => handleEditSalesQuotation(salesQuotation)}>Edit</Button>
                    <Button variant="destructive" onClick={() => handleDeleteSalesQuotation(salesQuotation.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
