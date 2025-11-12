"use client";

import { useEffect, useState } from "react";
import {
  createClientComponentClient,
  Session,
} from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";
import { UserProfile, UserRole } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PurchaseQuotation,
  PurchaseQuotationMaterial,
} from "@/types/purchase-quotation"; // We'll create this type next
import { SupplierManagementItem } from "@/types/supplier-management";
import { RawMaterial } from "@/types/raw-material";
import { Checkbox } from "@/components/ui/checkbox";
import { PurchaseOrder } from "@/types/purchase-order"; // Import PurchaseOrder type
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CreateSalesOrderModal } from "@/components/modals/create-sales-order-modal";

// Define a specific type for the data expected by the modal
interface QuotationForModal {
  id: string;
  supplier?: { name: string; supplier_shop: string };
  materials: { id: string; rawMaterialId: string; quantity: number }[];
}

const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager";

export default function SalesQuotationPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();

  const [salesQuotations, setSalesQuotations] = useState<PurchaseQuotation[]>(
    []
  );
  // State for Sales Orders (removed as management is centralized)
  const [suppliers, setSuppliers] = useState<SupplierManagementItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // State for material selection for conversion
  const [selectedMaterialsForConversion, setSelectedMaterialsForConversion] =
    useState<Map<string, Set<string>>>(new Map());
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [quotationsToConvert, setQuotationsToConvert] =
    useState<QuotationForModal[]>([]); // Changed type to QuotationForModal[]

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Form states for creating a new quotation
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );
  const [quotedPrice, setQuotedPrice] = useState<string>("");
  const [validityDate, setValidityDate] = useState<string>("");
  const [formMaterials, setFormMaterials] = useState<
    { rawMaterialId: string; quantity: number }[]
  >([]);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(
    null
  );

  const initialFormState = {
    selectedSupplierId: null,
    quotedPrice: "",
    validityDate: "",
    formMaterials: [],
  };

  useEffect(() => {
    const getSessionAndRole = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Session error:", sessionError);
        toast.error("Error fetching session: " + sessionError.message);
        setIsLoading(false);
        return;
      }
      setSession(session);

      if (session?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
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
      toast.error(
        "Error loading suppliers: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    }
  };

  const fetchRawMaterials = async () => {
    try {
      // Only fetch Finished Products for Sales Quotation Manager
      const response = await fetch("/api/admin/raw-materials/list?materialType=Finished+Product");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch raw materials");
      }
      const data: RawMaterial[] = await response.json();
      setRawMaterials(data);
    } catch (error: unknown) {
      console.error("Error fetching raw materials:", error);
      toast.error(
        "Error loading raw materials: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    }
  };

  const fetchSalesQuotations = async () => {
    setIsLoading(true);
    try {
      // Fetch Sales Quotations
      const quotationResponse = await fetch(
        "/api/admin/purchase-quotations/list?select=*,materials:purchasequotationmaterial(*,rawMaterial:RawMaterial(*))&showOrders=false"
      ); // Fetch only non-converted quotations
      if (!quotationResponse.ok) {
        const errorData = await quotationResponse.json();
        throw new Error(errorData.error || "Failed to fetch sales quotations");
      }
      const quotationData: PurchaseQuotation[] = await quotationResponse.json();
      setSalesQuotations(quotationData);

      // Removed sales order fetching logic

    } catch (error: unknown) {
      console.error("Error fetching data:", error);
      toast.error(
        "Error: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === SALES_QUOTATION_MANAGER_ROLE) {
      fetchSuppliers();
      fetchRawMaterials();
      fetchSalesQuotations(); // Call the new combined fetch function
    }
  }, [session, userRole]);

  // Debug logging
  useEffect(() => {
    if (rawMaterials.length > 0 && suppliers.length > 0) {
      console.log("DEBUG - Finished Products:", rawMaterials);
      console.log("DEBUG - Suppliers:", suppliers);
      console.log("DEBUG - Finished Products with Supplier IDs:", 
        rawMaterials.map(m => ({
          name: m.name,
          materialType: m.materialType,
          defaultSupplierId: m.defaultSupplierId,
          hasSupplier: !!m.defaultSupplierId
        }))
      );
    }
  }, [rawMaterials, suppliers]);

  // Filter suppliers to only show those that have materials
  const suppliersWithMaterials = suppliers.filter((supplier) => {
    const hasMaterials = rawMaterials.some((material) => {
      // Check if material's defaultSupplierId matches supplier id
      const matches = material.defaultSupplierId === supplier.id;
      return matches;
    });
    return hasMaterials;
  });

  console.log("DEBUG - Suppliers with materials:", suppliersWithMaterials);

  // Filter raw materials based on selected supplier
  const filteredRawMaterials = selectedSupplierId
    ? rawMaterials.filter((material) => material.defaultSupplierId === selectedSupplierId)
    : [];

  // Get supplier name for display
  const selectedSupplierName = selectedSupplierId
    ? suppliers.find((s) => s.id === selectedSupplierId)?.company_name || 
      suppliers.find((s) => s.id === selectedSupplierId)?.supplier_shop || 
      "Unknown Supplier"
    : null;

  // Clear materials when supplier changes
  useEffect(() => {
    if (selectedSupplierId && formMaterials.length > 0) {
      // Check if any current materials don't match the new supplier
      const invalidMaterials = formMaterials.filter((fm) => {
        const material = rawMaterials.find((rm) => rm.id === fm.rawMaterialId);
        return material && material.defaultSupplierId !== selectedSupplierId;
      });
      
      if (invalidMaterials.length > 0) {
        // Clear all materials when supplier changes to prevent inconsistency
        setFormMaterials([]);
        toast.info("Materials cleared. Please select materials from the new supplier.");
      }
    }
  }, [selectedSupplierId]);

  const handleAddMaterial = (rawMaterialId: string) => {
    setFormMaterials((prev) => {
      const existing = prev.find((m) => m.rawMaterialId === rawMaterialId);
      if (existing) {
        return prev.map((m) =>
          m.rawMaterialId === rawMaterialId
            ? { ...m, quantity: m.quantity + 1 }
            : m
        );
      } else {
        return [...prev, { rawMaterialId: rawMaterialId, quantity: 1 }];
      }
    });
  };

  const handleUpdateMaterialQuantity = (
    rawMaterialId: string,
    quantity: number
  ) => {
    setFormMaterials((prev) =>
      prev.map((m) =>
        m.rawMaterialId === rawMaterialId ? { ...m, quantity: quantity } : m
      )
    );
  };

  const handleRemoveMaterial = (rawMaterialId: string) => {
    setFormMaterials((prev) =>
      prev.filter((m) => m.rawMaterialId !== rawMaterialId)
    );
  };

  const handleEditSalesQuotation = (salesQuotation: PurchaseQuotation) => {
    setEditingQuotationId(salesQuotation.id);
    setSelectedSupplierId(salesQuotation.supplierId); // Changed from supplierid
    setQuotedPrice(salesQuotation.quotedPrice.toString());
    setValidityDate(salesQuotation.validityDate.split("T")[0]); // Format date for input
    setFormMaterials(
      salesQuotation.materials?.map((m) => ({
        rawMaterialId: m.rawMaterialId,
        quantity: m.quantity,
      })) || []
    );
  };

  const handleCancelEditSalesQuotation = () => {
    setEditingQuotationId(null);
    setSelectedSupplierId(initialFormState.selectedSupplierId);
    setQuotedPrice(initialFormState.quotedPrice);
    setValidityDate(initialFormState.validityDate);
    setFormMaterials(initialFormState.formMaterials);
  };

  const handleSubmitNewSalesQuotation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !selectedSupplierId ||
      quotedPrice === "" ||
      !validityDate ||
      formMaterials.length === 0
    ) {
      toast.error(
        "Please fill in all required fields and add at least one finished product."
      );
      return;
    }

    const payload = {
      supplierId: selectedSupplierId,
      quotedPrice: parseFloat(quotedPrice),
      validityDate: validityDate,
      materials: formMaterials,
    };

    let url = "/api/admin/purchase-quotations/create"; // Default URL for creation
    let method = "POST"; // Default method for creation

    if (editingQuotationId) {
      url = `/api/admin/purchase-quotations/update?id=${editingQuotationId}`;
      method = "PATCH";
    }

    console.log("DEBUG: Fetch URL", url);
    console.log("DEBUG: Fetch Method", method);
    console.log("DEBUG: Fetch Payload", JSON.stringify(payload));

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${
              editingQuotationId ? "update" : "create"
            } sales quotation`
        );
      }

      toast.success(
        `Sales quotation ${editingQuotationId ? "updated" : "created"}!`
      );
      // Clear form and re-fetch data
      handleCancelEditSalesQuotation(); // Use the new cancel function to clear the form
      fetchSalesQuotations(); // Re-fetch all data after creation/update
    } catch (error: unknown) {
      console.error(
        `Error ${
          editingQuotationId ? "updating" : "creating"
        } sales quotation:`,
        error
      );
      toast.error(
        `Error ${
          editingQuotationId ? "updating" : "creating"
        } sales quotation: ` +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    }
  };

  const handleDeleteSalesQuotation = async (salesQuotationId: string) => {
    if (
      !window.confirm("Are you sure you want to delete this sales quotation?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/purchase-quotations/delete?id=${salesQuotationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete sales quotation");
      }

      toast.success("Sales quotation deleted!");
      fetchSalesQuotations(); // Re-fetch all data after deletion
    } catch (error: unknown) {
      console.error("Error deleting sales quotation:", error);
      toast.error(
        "Error deleting sales quotation: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    }
  };

  const handleMaterialToggle = (quotationId: string, materialId: string) => {
    setSelectedMaterialsForConversion((prev) => {
      const newMap = new Map(prev);
      if (!newMap.has(quotationId)) {
        newMap.set(quotationId, new Set());
      }
      const materialSet = newMap.get(quotationId)!;
      if (materialSet.has(materialId)) {
        materialSet.delete(materialId);
      } else {
        materialSet.add(materialId);
      }
      if (materialSet.size === 0) {
        newMap.delete(quotationId);
      }
      return newMap;
    });
  };

  const handleConvertToSalesOrder = (quotation: PurchaseQuotation) => {
    // This function will now be unused directly by the button click,
    // but it's still used by the modal if we convert one by one (which we are not)
    // We will update the modal to accept an array of quotations
    console.log("DEBUG: handleConvertToSalesOrder called for quotation:", quotation.id);
    console.log("DEBUG: selectedForQuotation in handleConvertToSalesOrder:", selectedMaterialsForConversion.get(quotation.id));

    const selectedForQuotation = selectedMaterialsForConversion.get(quotation.id);
    if (!selectedForQuotation || selectedForQuotation.size === 0) {
      toast.error("Please select at least one finished product to convert for this quotation");
      return;
    }
    // Cast to QuotationForModal explicitly
    setQuotationsToConvert([{
      id: quotation.id,
      supplier: quotation.supplier,
      materials: quotation.materials?.map(m => ({
        id: m.id,
        rawMaterialId: m.rawMaterialId,
        quantity: m.quantity,
      })) || [],
    }]);
    setIsConvertModalOpen(true);
  };

  const confirmConvertToSalesOrder = async (
    quotationId: string,
    materialIds: string[]
  ) => {
    try {
      const response = await fetch(
        "/api/admin/purchase-quotations/convert-to-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quotationId: quotationId,
            materialIds: materialIds,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to convert to sales order");
      }

      toast.success("Sales quotation converted to sales order successfully!");

      // Clear selection for this quotation
      setSelectedMaterialsForConversion((prev) => {
        const newMap = new Map(prev);
        newMap.delete(quotationId);
        return newMap;
      });

      fetchSalesQuotations();
    } catch (error: unknown) {
      console.error("Error converting to sales order:", error);
      toast.error(
        "Error converting to sales order: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
      throw error; // Re-throw to allow modal to handle loading state
    }
  };

  // Removed handleDeleteSalesOrder as management is centralized

  if (isLoading) {
    return <div className="p-6">Loading sales quotation data...</div>;
  }

  if (!session || userRole !== SALES_QUOTATION_MANAGER_ROLE) {
    return (
      <div className="p-6 text-red-500">
        Access Denied: You do not have "Sales Quotation Manager" privileges to
        view this page.
      </div>
    );
  }

  const getRawMaterialName = (id: string) => {
    return (
      rawMaterials.find((rm) => rm.id === id)?.name || "Unknown Raw Material"
    );
  };

  // Removed getSupplierName function as supplier data is now eagerly loaded
  // const getSupplierName = (id: string) => {
  //   return (
  //     suppliers.find((s) => s.id === id)?.supplier_shop || "Unknown Supplier"
  //   );
  // };

  const getSalesQuotationNumber = (id: string | null | undefined) => {
    if (!id) return "N/A";
    return salesQuotations.find((pq) => pq.id === id)?.id || "N/A";
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Quotation Management</h1>

      <h2 className="text-xl font-semibold mb-4">Create New Sales Quotation</h2>
      {suppliersWithMaterials.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          <p className="font-semibold">⚠️ No suppliers with finished products available</p>
          <p className="text-sm mt-2">
            To create a quotation, you need to:
          </p>
          <ol className="text-sm mt-2 ml-4 list-decimal">
            <li>Go to <strong>Supplier Management</strong> and add suppliers (e.g., ELA Chemicals)</li>
            <li>Go to <strong>Raw Material Manager</strong> and add finished products with default suppliers</li>
            <li>Return here to create quotations</li>
          </ol>
        </div>
      )}
      <form
        onSubmit={handleSubmitNewSalesQuotation}
        className="grid gap-4 mb-8 p-4 border rounded-md bg-gray-50"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="supplier">Supplier Name</Label>
            <Select
              onValueChange={(value) =>
                setSelectedSupplierId(value === "none-selected" ? null : value)
              }
              value={selectedSupplierId || "none-selected"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none-selected">Select a supplier</SelectItem>
                {suppliersWithMaterials.length === 0 ? (
                  <SelectItem value="no-suppliers" disabled>
                    No suppliers with finished products found
                  </SelectItem>
                ) : (
                  suppliersWithMaterials.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name || supplier.supplier_shop}
                    </SelectItem>
                  ))
                )}
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

        <h3 className="text-lg font-medium mt-4 mb-2">
          Finished Products for Quotation
        </h3>
        {!selectedSupplierId ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
            ℹ️ Please select a supplier first to see available finished products from that supplier.
          </div>
        ) : filteredRawMaterials.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            ⚠️ No finished products available from {selectedSupplierName}. Please add finished products in Raw Material Manager.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rawMaterial">Select Finished Product (from {selectedSupplierName})</Label>
              <Select onValueChange={handleAddMaterial} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Add Finished Product" />
                </SelectTrigger>
                <SelectContent>
                  {filteredRawMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} ({material.unitOfMeasure})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-4">
          {formMaterials.length === 0 ? (
            <p>No finished products added to this quotation.</p>
          ) : (
            <ul className="space-y-2">
              {formMaterials.map((material) => (
                <li
                  key={material.rawMaterialId}
                  className="flex items-center space-x-2"
                >
                  <span>{getRawMaterialName(material.rawMaterialId)}</span>
                  <Input
                    type="number"
                    min="1"
                    value={material.quantity}
                    onChange={(e) =>
                      handleUpdateMaterialQuantity(
                        material.rawMaterialId,
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-20"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMaterial(material.rawMaterialId)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !selectedSupplierId || formMaterials.length === 0} 
          className="mt-4"
        >
          {editingQuotationId
            ? "Update Sales Quotation"
            : "Create Sales Quotation"}
        </Button>
        {(!selectedSupplierId || formMaterials.length === 0) && (
          <p className="text-sm text-gray-500 mt-2">
            {!selectedSupplierId 
              ? "Please select a supplier to continue" 
              : "Please add at least one finished product to continue"}
          </p>
        )}
        {editingQuotationId && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelEditSalesQuotation}
            className="mt-2"
          >
            Cancel Edit
          </Button>
        )}
      </form>

      <h2 className="text-xl font-semibold mb-4 mt-8">
        Existing Sales Quotations
      </h2>
      <Button
        onClick={() => {
          console.log("DEBUG: 'Convert Selected to Sales Order' button clicked.");
          console.log("DEBUG: selectedMaterialsForConversion state:", selectedMaterialsForConversion);

          if (selectedMaterialsForConversion.size === 0) {
            toast.error("Please select finished products from at least one quotation to convert.");
            return;
          }
          
          const selectedQuotations: QuotationForModal[] = []; // Changed type here
          for (const quotationId of selectedMaterialsForConversion.keys()) {
            console.log("DEBUG: Processing quotationId:", quotationId);
            const quotation = salesQuotations.find(q => q.id === quotationId);
            if (quotation) {
              console.log("DEBUG: Found quotation for ID:", quotationId, quotation);
              // Cast to QuotationForModal to match the expected type for the modal
              selectedQuotations.push({
                id: quotation.id,
                supplier: quotation.supplier,
                materials: quotation.materials?.map(m => ({
                  id: m.id,
                  rawMaterialId: m.rawMaterialId,
                  quantity: m.quantity,
                })) || [],
              });
            } else {
              console.warn("Warning: Could not find quotation for ID:", quotationId);
            }
          }

          if (selectedQuotations.length > 0) {
            setQuotationsToConvert(selectedQuotations);
            setIsConvertModalOpen(true);
          }
        }}
        disabled={selectedMaterialsForConversion.size === 0 || isLoading}
        className="bg-blue-600 hover:bg-blue-700 mb-4"
      >
        Convert Selected to Sales Order
      </Button>
      {salesQuotations.length === 0 ? (
        <p>No sales quotations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">Select</th>
                <th className="py-2 px-4 border-b text-left">Supplier</th>
                <th className="py-2 px-4 border-b text-left">Quoted Price</th>
                <th className="py-2 px-4 border-b text-left">Validity Date</th>
                <th className="py-2 px-4 border-b text-left">Finished Products</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesQuotations.map((salesQuotation) => {
                const selectedForQuotation =
                  selectedMaterialsForConversion.get(salesQuotation.id) ||
                  new Set();

                return (
                  <tr key={salesQuotation.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">
                      <Checkbox
                        key={`${salesQuotation.id}-${selectedForQuotation.size}`}
                        checked={
                          selectedForQuotation.size > 0
                        }
                        onCheckedChange={(checked) => {
                          setSelectedMaterialsForConversion((prev) => {
                            const newMap = new Map(prev); // Create a new Map instance
                            if (checked) {
                              // If checked, add all material IDs for this quotation
                              const materialIds = new Set(salesQuotation.materials?.map(m => m.id) || []); // Create a new Set instance
                              newMap.set(salesQuotation.id, materialIds);
                            } else {
                              // If unchecked, remove this quotation from the map
                              newMap.delete(salesQuotation.id);
                            }
                            return newMap;
                          });
                        }}
                      />
                    </td>
                    <td className="py-2 px-4 border-b">
                      {salesQuotation.supplier?.company_name || salesQuotation.supplier?.supplier_shop || "Unknown Supplier"}
                    </td>
                    <td className="py-2 px-4 border-b">
                      ₱{salesQuotation.quotedPrice.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 border-b">
                      {new Date(
                        salesQuotation.validityDate
                      ).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-4 border-b">
                      <ul className="list-disc list-inside space-y-1">
                        {salesQuotation.materials?.map((material) => (
                          <li
                            key={material.id}
                            className="flex items-center gap-2"
                          >
                            <span>
                              {material.rawMaterial?.name} x{" "}
                              {material.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-2 px-4 border-b space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleEditSalesQuotation(salesQuotation)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() =>
                          handleDeleteSalesQuotation(salesQuotation.id)
                        }
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ); // End of salesQuotation map
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog */}
      <CreateSalesOrderModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        onConfirm={confirmConvertToSalesOrder}
        quotationsToConvert={quotationsToConvert} // Pass the array of quotations
        selectedMaterials={selectedMaterialsForConversion} // Pass the entire map
        getRawMaterialName={getRawMaterialName}
      />
    </div>
  );
}
