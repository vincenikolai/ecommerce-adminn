'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PurchaseOrder, PurchaseOrderMaterial } from '@/types/purchase-order';
import { SupplierManagementItem } from '@/types/supplier-management';
import { RawMaterial } from '@/types/raw-material';

const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";

export default function POManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierManagementItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Filters and sorting
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdat' | 'poReferenceNumber' | 'deliveryDate' | 'totalAmount'>('createdat');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form states for creating/editing a purchase order
  const [selectedSupplierid, setSelectedSupplierid] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [poNumber, setPoNumber] = useState<string>("");
  const [status, setStatus] = useState<string>("Pending");
  const [selectedMaterials, setSelectedMaterials] = useState<PurchaseOrderMaterial[]>([]);
  const [editingPurchaseOrderId, setEditingPurchaseOrderId] = useState<string | null>(null);

  // Generate a unique PO number
  const generatePoNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${timestamp}-${random}`;
  };

  // Clear materials when supplier changes (to prevent inconsistent data)
  useEffect(() => {
    if (selectedSupplierid && selectedMaterials.length > 0 && !editingPurchaseOrderId) {
      // Check if any current materials don't match the new supplier
      const invalidMaterials = selectedMaterials.filter((sm) => {
        const material = rawMaterials.find((rm) => rm.id === sm.rawmaterialid);
        return material && material.defaultSupplierId !== selectedSupplierid;
      });
      
      if (invalidMaterials.length > 0) {
        // Clear all materials when supplier changes to prevent inconsistency
        setSelectedMaterials([]);
        toast("Materials cleared. Please select materials from the new supplier.");
      }
    }
  }, [selectedSupplierid, editingPurchaseOrderId]);

  const initialFormState = {
    selectedSupplierid: null,
    deliveryDate: "",
    poNumber: "",
    status: "Pending",
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
      // Only fetch Raw Materials (not Finished Products) for Purchase Order Manager
      const response = await fetch("/api/admin/raw-materials/list?materialType=Raw+Material");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch raw materials");
      }
      const data: RawMaterial[] = await response.json();
      
      // Double-check filter on frontend to ensure only Raw Materials
      const rawMaterialsOnly = data.filter(material => material.materialType === 'Raw Material');
      console.log("DEBUG - Fetched materials count:", data.length);
      console.log("DEBUG - Filtered to Raw Materials only:", rawMaterialsOnly.length);
      
      setRawMaterials(rawMaterialsOnly);
    } catch (error: unknown) {
      console.error("Error fetching raw materials:", error);
      toast.error("Error loading raw materials: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };


  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        sortBy: sortBy,
        sortOrder: sortOrder,
      }).toString();
      const response = await fetch(`/api/admin/purchase-orders/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch purchase orders");
      }
      const data: PurchaseOrder[] = await response.json();

      console.log("DEBUG - Fetched Purchase Orders (raw):", data);
      console.log("DEBUG - First PO materials:", data[0]?.materials);
      console.log("DEBUG - First PO supplier:", data[0]?.supplier);

      // Map purchaseordermaterial to materials for frontend compatibility
      const transformedData = data.map(po => ({
        ...po,
        materials: (po as any).purchaseordermaterial || po.materials || [], // Support both naming conventions
      }));

      console.log("DEBUG - Transformed Purchase Orders:", transformedData);
      setPurchaseOrders(transformedData);
    } catch (error: unknown) {
      console.error("Error fetching purchase orders:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === PURCHASING_MANAGER_ROLE) {
      fetchSuppliers();
      fetchRawMaterials();
      fetchPurchaseOrders();
    }
    console.log("useEffect - selectedMaterials (after fetch):", selectedMaterials);
  }, [session, userRole, statusFilter, sortBy, sortOrder]);

  const handleAddMaterial = (rawmaterialid: string, quantity: number = 1, unitprice: number = 0) => {
    setSelectedMaterials(prev => {
      const existing = prev.find(m => m.rawmaterialid === rawmaterialid);
      if (existing) {
        return prev.map(m => m.rawmaterialid === rawmaterialid ? { ...m, quantity: m.quantity + quantity, unitprice: unitprice > 0 ? unitprice : m.unitprice } : m);
      } else {
        // Generate a temporary ID for new materials not yet in DB
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        return [...prev, { id: tempId, purchaseOrderId: '', rawmaterialid, quantity, unitprice, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      }
    });
    console.log("handleAddMaterial - selectedMaterials:", selectedMaterials);
  };

  const handleUpdateMaterialQuantity = (rawmaterialid: string, quantity: number) => {
    setSelectedMaterials(prev =>
      prev.map(m => m.rawmaterialid === rawmaterialid ? { ...m, quantity: quantity } : m)
    );
    console.log("handleUpdateMaterialQuantity - selectedMaterials:", selectedMaterials);
  };

  const handleUpdateMaterialUnitPrice = (rawmaterialid: string, unitprice: number) => {
    setSelectedMaterials(prev =>
      prev.map(m => m.rawmaterialid === rawmaterialid ? { ...m, unitprice: unitprice } : m)
    );
    console.log("handleUpdateMaterialUnitPrice - selectedMaterials:", selectedMaterials);
  };

  const handleRemoveMaterial = (rawmaterialid: string) => {
    setSelectedMaterials(prev => prev.filter(m => m.rawmaterialid !== rawmaterialid));
  };


  const handleSubmitPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierid || !deliveryDate || !poNumber || selectedMaterials.length === 0) {
      toast.error("Please fill in all required fields and add at least one raw material.");
      return;
    }

    const payload = {
      supplierId: selectedSupplierid,
      purchaseQuotationId: null, // No longer using sales quotations
      deliveryDate: deliveryDate,
      poReferenceNumber: poNumber,
      status: status,
      // Map materials with correct property names
      materials: selectedMaterials.map(({ id, createdAt, updatedAt, ...rest }) => ({
        ...rest, // This includes purchaseOrderId and rawmaterialid
      })),
    };

    console.log("Payload being sent:", payload);

    try {
      const url = editingPurchaseOrderId
        ? `/api/admin/purchase-orders/update?id=${editingPurchaseOrderId}`
        : "/api/admin/purchase-orders/create";
      const method = editingPurchaseOrderId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Failed to ${editingPurchaseOrderId ? "update" : "create"} purchase order`;
        
        // Check for duplicate PO number error
        if (errorMessage.includes('duplicate key') || errorMessage.includes('poReferenceNumber')) {
          throw new Error(`PO Number "${poNumber}" already exists. Please use a different PO number or click "Generate" for a unique one.`);
        }
        
        throw new Error(errorMessage);
      }

      toast.success(`Purchase order ${editingPurchaseOrderId ? "updated" : "created"}!`);
      handleCancelEdit();
      fetchPurchaseOrders();
    } catch (error: unknown) {
      console.error(`Error ${editingPurchaseOrderId ? "updating" : "creating"} purchase order:`, error);
      toast.error(`Error ${editingPurchaseOrderId ? "updating" : "creating"} purchase order: ` + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const handleEditPurchaseOrder = (po: PurchaseOrder) => {
    setEditingPurchaseOrderId(po.id);
    setSelectedSupplierid(typeof po.supplierId === 'object' ? (po.supplierId as any).supplier_shop : po.supplierId);
    setDeliveryDate(po.deliveryDate.split('T')[0]);
    setPoNumber(po.poReferenceNumber);
    setStatus(po.status || 'Pending'); // Use actual status from PO
    setSelectedMaterials(po.materials || []);
    console.log("handleEditPurchaseOrder - selectedMaterials:", selectedMaterials);
  };

  const handleCancelEdit = () => {
    setEditingPurchaseOrderId(null);
    setSelectedSupplierid(initialFormState.selectedSupplierid);
    setDeliveryDate(initialFormState.deliveryDate);
    setPoNumber(initialFormState.poNumber);
    setStatus(initialFormState.status);
    setSelectedMaterials(initialFormState.selectedMaterials);
  };

  const handleGeneratePoNumber = () => {
    const newPoNumber = generatePoNumber();
    setPoNumber(newPoNumber);
    toast.success("PO Number generated!");
  };

  const handleDeletePurchaseOrder = async (poId: string) => {
    if (!window.confirm("Are you sure you want to delete this purchase order?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/purchase-orders/delete?id=${poId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete purchase order");
      }

      toast.success("Purchase order deleted successfully!");
      fetchPurchaseOrders();
    } catch (error: unknown) {
      console.error("Error deleting purchase order:", error);
      toast.error("Error deleting purchase order: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading purchase order data...</div>;
  }

  if (!session || userRole !== PURCHASING_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Purchasing Manager" privileges to view this page.</div>;
  }

  // Filter suppliers to only show those that have raw materials (not finished products)
  const suppliersWithRawMaterials = suppliers.filter((supplier) => {
    // Find all raw materials (materialType='Raw Material') that have this supplier
    const rawMaterialsForThisSupplier = rawMaterials.filter(
      (material) => material.materialType === 'Raw Material' && material.defaultSupplierId === supplier.id
    );
    
    const hasRawMaterials = rawMaterialsForThisSupplier.length > 0;
    
    if (hasRawMaterials) {
      console.log(`✅ Supplier "${supplier.company_name || supplier.supplier_shop}" has ${rawMaterialsForThisSupplier.length} raw material(s)`);
    }
    
    return hasRawMaterials;
  });

  // Filter raw materials based on selected supplier (supplier-first workflow)
  const filteredRawMaterials = selectedSupplierid
    ? rawMaterials.filter((material) => material.defaultSupplierId === selectedSupplierid)
    : [];

  // Get supplier name for display
  const selectedSupplierName = selectedSupplierid
    ? suppliers.find((s) => s.id === selectedSupplierid)?.company_name || 
      suppliers.find((s) => s.id === selectedSupplierid)?.supplier_shop || 
      "Unknown Supplier"
    : null;

  // Debug logging
  console.log("DEBUG - PO Manager - All Suppliers:", suppliers.map(s => ({ id: s.id, name: s.company_name || s.supplier_shop })));
  console.log("DEBUG - PO Manager - Raw Materials:", rawMaterials.map(m => ({
    name: m.name,
    materialType: m.materialType,
    supplierId: m.defaultSupplierId,
    supplierName: suppliers.find(s => s.id === m.defaultSupplierId)?.company_name || 'Unknown'
  })));
  console.log("DEBUG - PO Manager - Filtered Suppliers with Raw Materials:", 
    suppliersWithRawMaterials.map(s => ({ id: s.id, name: s.company_name || s.supplier_shop }))
  );
  console.log("DEBUG - PO Manager - Filtered Raw Materials for Selected Supplier:", filteredRawMaterials);

  const getRawMaterialName = (id: string) => {
    return rawMaterials.find(rm => rm.id === id)?.name || 'Unknown Raw Material';
  };

  const getSupplierName = (supplierIdOrObject: string | { company_name?: string; supplier_shop?: string } | null | undefined) => {
    if (!supplierIdOrObject) return 'Unknown Supplier';

    if (typeof supplierIdOrObject === 'object' && supplierIdOrObject !== null) {
      return supplierIdOrObject.company_name || supplierIdOrObject.supplier_shop || 'Unknown Supplier';
    } else if (typeof supplierIdOrObject === 'string') {
      // Fallback for cases where only the ID is available
      const supplier = suppliers.find(s => s.id === supplierIdOrObject);
      return supplier?.company_name || supplier?.supplier_shop || 'Unknown Supplier';
    }
    return 'Unknown Supplier';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-blue-100 text-blue-800';
      case 'PartiallyDelivered':
        return 'bg-orange-100 text-orange-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter purchase orders by status
  const filteredPurchaseOrders = statusFilter === 'all' 
    ? purchaseOrders 
    : purchaseOrders.filter(po => po.status === statusFilter);


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Purchase Order Management</h1>
      </div>

      <h2 className="text-xl font-semibold mb-4">{editingPurchaseOrderId ? "Edit Purchase Order" : "Create New Purchase Order"}</h2>
      {suppliersWithRawMaterials.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          <p className="font-semibold">⚠️ No suppliers with raw materials available</p>
          <p className="text-sm mt-2">
            To create a purchase order, you need to:
          </p>
          <ol className="text-sm mt-2 ml-4 list-decimal">
            <li>Go to <strong>Supplier Management</strong> and add suppliers</li>
            <li>Go to <strong>Raw Material Manager</strong> and add raw materials (not finished products) with default suppliers</li>
            <li>Return here to create purchase orders</li>
          </ol>
        </div>
      )}
      <form onSubmit={handleSubmitPurchaseOrder} className="grid gap-4 mb-8 p-4 border rounded-md bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="supplier">Supplier Name</Label>
            <Select onValueChange={(value) => setSelectedSupplierid(value === "none-selected" ? null : value)} value={selectedSupplierid || "none-selected"}>
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none-selected">None</SelectItem>
                {suppliersWithRawMaterials.length === 0 ? (
                  <SelectItem value="no-suppliers" disabled>
                    No suppliers with raw materials found
                  </SelectItem>
                ) : (
                  suppliersWithRawMaterials.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name || supplier.supplier_shop}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="poNumber">PO Number</Label>
            <div className="flex gap-2">
              <Input
                id="poNumber"
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
                placeholder="Enter or generate PO number"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePoNumber}
                disabled={editingPurchaseOrderId !== null}
              >
                Generate
              </Button>
            </div>
            {!editingPurchaseOrderId && (
              <p className="text-xs text-gray-500 mt-1">
                💡 Click "Generate" for a unique PO number
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value: string) => setStatus(value)} value={status}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="PartiallyDelivered">Partially Delivered</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <h3 className="text-lg font-medium mt-4 mb-2">Raw Materials for Purchase Order</h3>
        {!selectedSupplierid ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
            ℹ️ Please select a supplier first to see available raw materials from that supplier.
          </div>
        ) : filteredRawMaterials.length === 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            ⚠️ No raw materials available from {selectedSupplierName}. Please add raw materials for this supplier in Raw Material Manager.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rawMaterial">Add Raw Material (from {selectedSupplierName})</Label>
              <Select onValueChange={(value) => handleAddMaterial(value)} value="">
                <SelectTrigger>
                  <SelectValue placeholder="Add Raw Material" />
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
          {selectedMaterials.length === 0 ? (
            <p>No raw materials added to this purchase order.</p>
          ) : (
            <ul className="space-y-2">
              {selectedMaterials.map((material) => (
                <li key={material.rawmaterialid} className="flex items-center space-x-2">
                  <span>{getRawMaterialName(material.rawmaterialid)}</span>
                  <Input
                    type="number"
                    min="1"
                    value={material.quantity}
                    onChange={(e) => handleUpdateMaterialQuantity(material.rawmaterialid, parseInt(e.target.value, 10))}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={material.unitprice}
                    onChange={(e) => handleUpdateMaterialUnitPrice(material.rawmaterialid, parseFloat(e.target.value))}
                    className="w-24"
                    placeholder="Unit Price"
                  />
                  <Button variant="destructive" size="sm" onClick={() => handleRemoveMaterial(material.rawmaterialid)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isLoading || !selectedSupplierid || selectedMaterials.length === 0} 
          className="mt-4"
        >
          {editingPurchaseOrderId ? "Update Purchase Order" : "Create Purchase Order"}
        </Button>
        {(!selectedSupplierid || selectedMaterials.length === 0) && (
          <p className="text-sm text-gray-500 mt-2">
            {!selectedSupplierid 
              ? "Please select a supplier to continue" 
              : "Please add at least one raw material to continue"}
          </p>
        )}
        {editingPurchaseOrderId && (
          <Button type="button" variant="outline" onClick={handleCancelEdit} className="mt-2">
            Cancel Edit
          </Button>
        )}
      </form>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <Label htmlFor="statusFilter">Filter by Status</Label>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Orders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="PartiallyDelivered">Partially Delivered</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select onValueChange={(value: any) => setSortBy(value)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdat">Date Created</SelectItem>
              <SelectItem value="poReferenceNumber">PO Number</SelectItem>
              <SelectItem value="deliveryDate">Delivery Date</SelectItem>
              <SelectItem value="totalAmount">Total Amount</SelectItem>
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
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold">{purchaseOrders.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <p className="text-sm text-yellow-800">Pending</p>
          <p className="text-2xl font-bold text-yellow-900">
            {purchaseOrders.filter(o => o.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <p className="text-sm text-blue-800">Approved</p>
          <p className="text-2xl font-bold text-blue-900">
            {purchaseOrders.filter(o => o.status === 'Approved').length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <p className="text-sm text-green-800">Completed</p>
          <p className="text-2xl font-bold text-green-900">
            {purchaseOrders.filter(o => o.status === 'Completed').length}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4 mt-8">Existing Purchase Orders</h2>
      {filteredPurchaseOrders.length === 0 ? (
        <p>{statusFilter === 'all' ? 'No purchase orders found.' : `No ${statusFilter} purchase orders found.`}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 border-b text-left font-semibold">PO Number</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Supplier</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Status</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Order Date</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Delivery Date</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Materials</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Total Price</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchaseOrders.map((po) => {
                console.log(`DEBUG - Rendering PO ${po.poReferenceNumber}:`, {
                  id: po.id,
                  materials: po.materials,
                  materialsLength: po.materials?.length,
                  supplier: po.supplier
                });
                
                return (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">
                      <div className="font-medium">{po.poReferenceNumber}</div>
                      <div className="text-xs text-gray-500">{po.id.substring(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-4 border-b">
                      <div className="font-medium">
                        {po.supplier?.company_name || getSupplierName(po.supplierId)}
                      </div>
                    </td>
                    <td className="py-3 px-4 border-b">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(po.status || 'Pending')}`}>
                        {po.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b text-sm">
                      {formatDateOnly(po.orderDate || po.createdat)}
                    </td>
                    <td className="py-3 px-4 border-b text-sm">
                      {formatDateOnly(po.deliveryDate)}
                    </td>
                    <td className="py-3 px-4 border-b">
                      {!po.materials || po.materials.length === 0 ? (
                        <span className="text-gray-400 italic">No materials</span>
                      ) : (
                        <ul className="list-disc list-inside">
                          {po.materials.map((material, index) => {
                            console.log(`DEBUG - Material ${index}:`, material);
                            return (
                              <li key={index}>
                                {(material as any).rawMaterial?.name || getRawMaterialName(material.rawmaterialid)} x {material.quantity} @ ₱{material.unitprice.toFixed(2)}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </td>
                    <td className="py-3 px-4 border-b font-medium">
                      {po.materials && po.materials.length > 0
                        ? `₱${po.materials.reduce((sum, m) => sum + (m.quantity * m.unitprice), 0).toFixed(2)}`
                        : '₱0.00'}
                    </td>
                    <td className="py-3 px-4 border-b">
                      <div className="flex space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEditPurchaseOrder(po)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeletePurchaseOrder(po.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
