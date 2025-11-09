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
import { PurchaseQuotation } from '@/types/purchase-quotation'; // Only need PurchaseQuotation here

const PURCHASING_MANAGER_ROLE: UserRole = "purchasing_manager";

export default function POManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierManagementItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [salesQuotations, setSalesQuotations] = useState<PurchaseQuotation[]>([]);

  // Form states for creating/editing a purchase order
  const [selectedSupplierid, setSelectedSupplierid] = useState<string | null>(null);
  const [selectedQuotationid, setSelectedQuotationid] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [poNumber, setPoNumber] = useState<string>("");
  const [status, setStatus] = useState<PurchaseOrder["status"]>("Pending");
  const [selectedMaterials, setSelectedMaterials] = useState<PurchaseOrderMaterial[]>([]);
  const [editingPurchaseOrderId, setEditingPurchaseOrderId] = useState<string | null>(null);

  const initialFormState = {
    selectedSupplierid: null,
    selectedQuotationid: null,
    deliveryDate: "",
    poNumber: "",
    status: "Pending" as PurchaseOrder["status"],
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
    try {
      const response = await fetch("/api/admin/purchase-quotations/list"); // API route is now for sales quotations
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch sales quotations");
      }
      const data: PurchaseQuotation[] = await response.json();
      setSalesQuotations(data);
    } catch (error: unknown) {
      console.error("Error fetching sales quotations:", error);
      toast.error("Error loading sales quotations: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/purchase-orders/list");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch purchase orders");
      }
      const data: PurchaseOrder[] = await response.json();

      // Map purchaseordermaterial to materials for frontend compatibility
      const transformedData = data.map(po => ({
        ...po,
        materials: (po as any).purchaseordermaterial || [], // Correctly map purchaseordermaterial to materials
      }));

      console.log("Fetched and Transformed Purchase Orders:", transformedData);
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
      fetchSalesQuotations();
      fetchPurchaseOrders();
    }
    console.log("useEffect - selectedMaterials (after fetch):", selectedMaterials);
  }, [session, userRole]);

  const handleAddMaterial = (rawmaterialid: string, quantity: number = 1, unitprice: number = 0) => {
    setSelectedMaterials(prev => {
      const existing = prev.find(m => m.rawmaterialid === rawmaterialid);
      if (existing) {
        return prev.map(m => m.rawmaterialid === rawmaterialid ? { ...m, quantity: m.quantity + quantity, unitprice: unitprice > 0 ? unitprice : m.unitprice } : m);
      } else {
        // Generate a temporary ID for new materials not yet in DB
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        return [...prev, { id: tempId, purchaseorderid: '', rawmaterialid, quantity, unitprice, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
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

  const handleSelectSalesQuotation = (quotationId: string) => {
    if (quotationId === "none-selected") {
      setSelectedQuotationid(null);
      // Clear materials or revert to default if needed
      setSelectedMaterials([]);
      return;
    }

    const salesQuotation = salesQuotations.find(q => q.id === quotationId);
    if (salesQuotation) {
      setSelectedQuotationid(salesQuotation.id);
      setSelectedSupplierid(salesQuotation.supplierid); // Use lowercase supplierid
      setDeliveryDate(""); // Clear delivery date for new PO
      setPoNumber("");     // Clear PO number for new PO
      setStatus("Pending"); // Default status
      // Populate materials from quotation, setting unitPrice to quotedPrice if available
      const materialsFromQuotation: PurchaseOrderMaterial[] = salesQuotation.materials?.map(qm => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        purchaseorderid: '', // Use lowercase purchaseorderid
        rawmaterialid: qm.rawMaterialId || '',
        quantity: qm.quantity,
        unitprice: (salesQuotation.quotedPrice && qm.quantity && qm.quantity > 0) ? (salesQuotation.quotedPrice / qm.quantity) : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })) || [];
      setSelectedMaterials(materialsFromQuotation);
    }
    console.log("handleSelectSalesQuotation - selectedMaterials:", selectedMaterials);
  };

  const handleSubmitPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierid || !deliveryDate || !poNumber || selectedMaterials.length === 0) {
      toast.error("Please fill in all required fields and add at least one material.");
      return;
    }

    const payload = {
      supplierid: selectedSupplierid,
      purchasequotationid: selectedQuotationid,
      deliverydate: deliveryDate,
      ponumber: poNumber,
      status: status,
      // Map to ensure all material properties are lowercase to match backend
      materials: selectedMaterials.map(({ id, createdAt, updatedAt, ...rest }) => ({
        ...rest, // This now correctly includes purchaseorderid and rawmaterialid from the updated type
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
        throw new Error(errorData.error || `Failed to ${editingPurchaseOrderId ? "update" : "create"} purchase order`);
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
    setSelectedSupplierid(typeof po.supplierid === 'object' ? po.supplierid.supplier_shop : po.supplierid);
    setSelectedQuotationid(po.purchasequotationid || null);
    setDeliveryDate(po.deliverydate.split('T')[0]);
    setPoNumber(po.ponumber);
    setStatus(po.status);
    setSelectedMaterials(po.materials || []);
    console.log("handleEditPurchaseOrder - selectedMaterials:", selectedMaterials);
  };

  const handleCancelEdit = () => {
    setEditingPurchaseOrderId(null);
    setSelectedSupplierid(initialFormState.selectedSupplierid);
    setSelectedQuotationid(initialFormState.selectedQuotationid);
    setDeliveryDate(initialFormState.deliveryDate);
    setPoNumber(initialFormState.poNumber);
    setStatus(initialFormState.status);
    setSelectedMaterials(initialFormState.selectedMaterials);
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

  const getRawMaterialName = (id: string) => {
    return rawMaterials.find(rm => rm.id === id)?.name || 'Unknown Raw Material';
  };

  const getSupplierName = (supplierIdOrObject: string | { supplier_shop: string } | null | undefined) => {
    if (!supplierIdOrObject) return 'Unknown Supplier';

    if (typeof supplierIdOrObject === 'object' && supplierIdOrObject !== null && 'supplier_shop' in supplierIdOrObject) {
      return supplierIdOrObject.supplier_shop;
    } else if (typeof supplierIdOrObject === 'string') {
      // Fallback for cases where only the ID is available or type is not yet updated everywhere
      return suppliers.find(s => s.id === supplierIdOrObject)?.supplier_shop || 'Unknown Supplier';
    }
    return 'Unknown Supplier';
  };

  const getSalesQuotationNumber = (id: string | null | undefined) => {
    if (!id) return 'N/A';
    // Assuming salesQuotation ID acts as its identifier for display
    return salesQuotations.find(pq => pq.id === id)?.id || 'N/A';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Purchase Order Management</h1>

      <h2 className="text-xl font-semibold mb-4">{editingPurchaseOrderId ? "Edit Purchase Order" : "Create New Purchase Order"}</h2>
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
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.supplier_shop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="salesQuotation">Link to Sales Quotation (Optional)</Label>
            <Select onValueChange={handleSelectSalesQuotation} value={selectedQuotationid || "none-selected"}>
              <SelectTrigger>
                <SelectValue placeholder="Select a sales quotation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none-selected">None</SelectItem>
                {salesQuotations.map((salesQuotation) => (
                  <SelectItem key={salesQuotation.id} value={salesQuotation.id}>
                    Quotation ID: {salesQuotation.id} (Supplier: {getSupplierName(salesQuotation.supplierid || '')}, Price: ₱{salesQuotation.quotedPrice.toFixed(2)})
                  </SelectItem>
                ))}
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
            <Input
              id="poNumber"
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value: PurchaseOrder["status"]) => setStatus(value)} value={status}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <h3 className="text-lg font-medium mt-4 mb-2">Materials for Purchase Order</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rawMaterial">Add Raw Material</Label>
            <Select onValueChange={(value) => handleAddMaterial(value)} value="">
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
            <p>No materials added to this purchase order.</p>
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

        <Button type="submit" disabled={isLoading} className="mt-4">
          {editingPurchaseOrderId ? "Update Purchase Order" : "Create Purchase Order"}
        </Button>
        {editingPurchaseOrderId && (
          <Button type="button" variant="outline" onClick={handleCancelEdit} className="mt-2">
            Cancel Edit
          </Button>
        )}
      </form>

      <h2 className="text-xl font-semibold mb-4 mt-8">Existing Purchase Orders</h2>
      {purchaseOrders.length === 0 ? (
        <p>No purchase orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">PO Number</th>
                <th className="py-2 px-4 border-b text-left">Supplier</th>
                <th className="py-2 px-4 border-b text-left">Delivery Date</th>
                <th className="py-2 px-4 border-b text-left">Status</th>
                <th className="py-2 px-4 border-b text-left">Materials</th>
                <th className="py-2 px-4 border-b text-left">Total Price</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{po.ponumber}</td>
                  <td className="py-2 px-4 border-b">{getSupplierName(po.supplierid)}</td>
                  <td className="py-2 px-4 border-b">
                    {po.deliverydate ? new Date(po.deliverydate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-2 px-4 border-b">{po.status}</td>
                  <td className="py-2 px-4 border-b">
                    <ul className="list-disc list-inside">
                      {po.materials?.map((material, index) => (
                        <li key={index}>
                          {getRawMaterialName(material.rawmaterialid)} x {material.quantity} @ ₱{material.unitprice.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2 px-4 border-b">₱{po.materials?.reduce((sum, m) => sum + (m.quantity * m.unitprice), 0).toFixed(2)}</td>
                  <td className="py-2 px-4 border-b space-x-2">
                    <Button variant="secondary" onClick={() => handleEditPurchaseOrder(po)}>Edit</Button>
                    <Button variant="destructive" onClick={() => handleDeletePurchaseOrder(po.id)}>Delete</Button>
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
