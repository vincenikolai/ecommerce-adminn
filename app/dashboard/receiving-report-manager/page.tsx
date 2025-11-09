'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReceivingReport, ReceivingReportItem } from '@/types/receiving-report';
import { PurchaseOrder, PurchaseOrderMaterial } from '@/types/purchase-order';
import { RawMaterial } from '@/types/raw-material';

const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";

export default function ReceivingReportManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();

  const [receivingReports, setReceivingReports] = useState<ReceivingReport[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // Form states for creating a new receiving report
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [receivedDate, setReceivedDate] = useState<string>("");
  const [warehouseLocation, setWarehouseLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [receivedMaterials, setReceivedMaterials] = useState<{
    rawmaterialid: string;
    expectedQuantity: number;
    receivedQuantity: number;
  }[]>([]);

  const initialFormState = {
    selectedPurchaseOrderId: null,
    receivedDate: "",
    warehouseLocation: "",
    notes: "",
    receivedMaterials: [],
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

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch("/api/admin/purchase-orders/list");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch purchase orders");
      }
      const data: PurchaseOrder[] = await response.json();
      const transformedData = data.map(po => ({
        ...po,
        materials: (po as any).purchaseordermaterial || [], // Map the nested materials from API response
      }));
      setPurchaseOrders(transformedData.filter(po => po.status === "Approved" || po.status === "Pending")); // Only show relevant POs
    } catch (error: unknown) {
      console.error("Error fetching purchase orders:", error);
      toast.error("Error loading purchase orders: " + (error instanceof Error ? error.message : "An unknown error occurred"));
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

  const fetchReceivingReports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/receiving-reports/list");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch receiving reports");
      }
      const data: ReceivingReport[] = await response.json();
      const transformedData = data.map(report => ({
        ...report,
        purchaseOrder: report.purchaseOrder || undefined, // Corrected casing
        items: (report as any).receivingreportitem || [], // Map the nested items from API response
      }));
      setReceivingReports(transformedData);
    } catch (error: unknown) {
      console.error("Error fetching receiving reports:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === WAREHOUSE_STAFF_ROLE) {
      fetchPurchaseOrders();
      fetchRawMaterials();
      fetchReceivingReports();
    }
  }, [session, userRole]);

  const handlePurchaseOrderSelect = (poId: string) => {
    setSelectedPurchaseOrderId(poId === "none-selected" ? null : poId);
    if (poId !== "none-selected") {
      const selectedPO = purchaseOrders.find(po => po.id === poId);
      if (selectedPO?.materials) {
        setReceivedMaterials(selectedPO.materials.map(mat => ({
          rawmaterialid: mat.rawmaterialid,
          expectedQuantity: mat.quantity,
          receivedQuantity: 0, // Default to 0 received
        })));
      } else {
        setReceivedMaterials([]);
      }
    } else {
      setReceivedMaterials([]);
    }
  };

  const handleReceivedQuantityChange = (rawmaterialid: string, quantity: number) => {
    setReceivedMaterials(prev =>
      prev.map(item =>
        item.rawmaterialid === rawmaterialid ? { ...item, receivedQuantity: quantity } : item
      )
    );
  };

  const handleSubmitReceivingReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPurchaseOrderId || !receivedDate || !warehouseLocation || receivedMaterials.length === 0) {
      toast.error("Please fill in all required fields and add at least one received material.");
      return;
    }

    const itemsToSubmit: ReceivingReportItem[] = receivedMaterials.map(mat => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      receivingreportid: '', // Will be set by API
      rawmaterialid: mat.rawmaterialid,
      quantity: mat.receivedQuantity,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
    })).filter(item => item.quantity > 0);

    if (itemsToSubmit.length === 0) {
      toast.error("Please enter received quantities for at least one material.");
      return;
    }

    const payload = {
      purchaseorderid: selectedPurchaseOrderId,
      receiveddate: receivedDate,
      warehouselocation: warehouseLocation,
      notes: notes,
      items: itemsToSubmit,
    };

    try {
      const response = await fetch("/api/admin/receiving-reports/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create receiving report");
      }

      toast.success("Receiving report created successfully!");
      // Clear form and re-fetch data
      handleCancelForm();
      fetchReceivingReports();
    } catch (error: unknown) {
      console.error("Error creating receiving report:", error);
      toast.error("Error creating receiving report: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const handleCancelForm = () => {
    setSelectedPurchaseOrderId(initialFormState.selectedPurchaseOrderId);
    setReceivedDate(initialFormState.receivedDate);
    setWarehouseLocation(initialFormState.warehouseLocation);
    setNotes(initialFormState.notes);
    setReceivedMaterials(initialFormState.receivedMaterials);
  };

  const getRawMaterialName = (id: string) => {
    const material = rawMaterials.find(rm => rm.id === id);
    return material ? `${material.name} (${material.unitOfMeasure})` : 'Unknown Raw Material';
  };

  if (isLoading) {
    return <div className="p-6">Loading receiving report data...</div>;
  }

  if (!session || userRole !== WAREHOUSE_STAFF_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Warehouse Staff" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Receiving Report Management</h1>

      <h2 className="text-xl font-semibold mb-4">Create New Receiving Report</h2>
      <form onSubmit={handleSubmitReceivingReport} className="grid gap-4 mb-8 p-4 border rounded-md bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="purchaseOrder">Purchase Order</Label>
            <Select onValueChange={handlePurchaseOrderSelect} value={selectedPurchaseOrderId || "none-selected"}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Purchase Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none-selected">None</SelectItem>
                {purchaseOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    PO#: {po.ponumber} (Supplier: {(po.supplierid as { supplier_shop: string }).supplier_shop}) - Due: {new Date(po.deliverydate).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="receivedDate">Date Received</Label>
            <Input
              id="receivedDate"
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="warehouseLocation">Warehouse Location</Label>
            <Input
              id="warehouseLocation"
              type="text"
              value={warehouseLocation}
              onChange={(e) => setWarehouseLocation(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes (Discrepancies/Damages)</Label>
            <Input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <h3 className="text-lg font-medium mt-4 mb-2">Materials Received</h3>
        {selectedPurchaseOrderId ? (
          receivedMaterials.length === 0 ? (
            <p>No materials found for this Purchase Order or PO not selected.</p>
          ) : (
            <div className="space-y-2">
              {receivedMaterials.map((material) => (
                <div key={material.rawmaterialid} className="flex items-center space-x-2">
                  <Label className="w-48">{getRawMaterialName(material.rawmaterialid)} (Expected: {material.expectedQuantity})</Label>
                  <Input
                    type="number"
                    min="0"
                    value={material.receivedQuantity}
                    onChange={(e) => handleReceivedQuantityChange(material.rawmaterialid, parseInt(e.target.value, 10))}
                    className="w-24"
                  />
                </div>
              ))}
            </div>
          )
        ) : (
          <p>Please select a Purchase Order to view expected materials.</p>
        )}

        <Button type="submit" disabled={isLoading} className="mt-4">
          Create Receiving Report
        </Button>
      </form>

      <h2 className="text-xl font-semibold mb-4 mt-8">Existing Receiving Reports</h2>
      {receivingReports.length === 0 ? (
        <p>No receiving reports found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">PO Number</th>
                <th className="py-2 px-4 border-b text-left">Date Received</th>
                <th className="py-2 px-4 border-b text-left">Warehouse Location</th>
                <th className="py-2 px-4 border-b text-left">Materials</th>
                <th className="py-2 px-4 border-b text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {receivingReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  
                  <td className="py-2 px-4 border-b">{report.purchaseOrder?.ponumber || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{new Date(report.receiveddate).toLocaleDateString()}</td>
                  <td className="py-2 px-4 border-b">{report.warehouselocation}</td>
                  <td className="py-2 px-4 border-b">
                    <ul className="list-disc list-inside">
                      {report.items?.map((item, index) => (
                        <li key={index}>
                          {item.rawMaterial?.name}: {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2 px-4 border-b">{report.notes || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
