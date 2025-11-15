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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History } from 'lucide-react';

const WAREHOUSE_STAFF_ROLE: UserRole = "warehouse_staff";

export default function ReceivingReportManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();

  const [receivingReports, setReceivingReports] = useState<ReceivingReport[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<{
    receivingReportId: string;
    receivedDate: string;
    history: Array<{
      id: string;
      rawMaterialId: string;
      rawMaterialName: string;
      quantityReceived: number;
      stockBefore: number;
      stockAfter: number;
      receivedDate: string;
      createdAt: string;
    }>;
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form states for creating a new receiving report
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [receivedDate, setReceivedDate] = useState<string>("");
  const [warehouseLocation, setWarehouseLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [receivedMaterials, setReceivedMaterials] = useState<{
    rawmaterialid: string;
    expectedQuantity: number;
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
      // Only fetch Approved purchase orders from the API
      const response = await fetch("/api/admin/purchase-orders/list?status=Approved");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch purchase orders");
      }
      const data: PurchaseOrder[] = await response.json();
      
      console.log("DEBUG - Receiving Report - Fetched Approved Purchase Orders:", data);
      console.log("DEBUG - First PO materials:", data[0]?.materials);
      
      const transformedData = data.map(po => ({
        ...po,
        materials: po.materials || (po as any).purchaseordermaterial || [], // Support both naming conventions
      }));
      
      console.log("DEBUG - Transformed Purchase Orders:", transformedData.map(po => ({
        id: po.id,
        poReferenceNumber: po.poReferenceNumber,
        materialsCount: po.materials?.length || 0
      })));
      
      // Filter POs - show only those that have materials (status is already filtered to Approved by API)
      const filteredPOs = transformedData.filter(po => {
        const hasMaterials = po.materials && po.materials.length > 0;
        console.log(`DEBUG - PO ${po.poReferenceNumber}: status=${po.status}, hasMaterials=${hasMaterials}, materialsCount=${po.materials?.length || 0}`);
        return hasMaterials;
      });
      
      console.log("DEBUG - Filtered Approved POs with materials:", filteredPOs.length);
      setPurchaseOrders(filteredPOs);
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
      
      console.log("DEBUG - Receiving Reports (raw):", data);
      console.log("DEBUG - First report purchaseorder:", (data[0] as any)?.purchaseorder);
      
      const transformedData = data.map(report => ({
        ...report,
        purchaseOrder: (report as any).purchaseorder || report.purchaseOrder || undefined, // Map from lowercase API response
        items: (report as any).receivingreportitem || report.items || [], // Map the nested items from API response
      }));
      
      console.log("DEBUG - Transformed Receiving Reports:", transformedData.map(r => ({
        id: r.id,
        poNumber: r.purchaseOrder?.poReferenceNumber,
        hasPurchaseOrder: !!r.purchaseOrder
      })));
      
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
      console.log("DEBUG - Selected PO:", selectedPO);
      console.log("DEBUG - Selected PO materials:", selectedPO?.materials);
      console.log("DEBUG - Materials length:", selectedPO?.materials?.length);
      
      if (selectedPO?.materials && selectedPO.materials.length > 0) {
        const mappedMaterials = selectedPO.materials.map(mat => ({
          rawmaterialid: mat.rawmaterialid,
          expectedQuantity: mat.quantity,
          receivedQuantity: mat.quantity, // Set to expected quantity automatically
        }));
        console.log("DEBUG - Mapped materials for form:", mappedMaterials);
        setReceivedMaterials(mappedMaterials);
      } else {
        console.log("DEBUG - No materials found for selected PO");
        setReceivedMaterials([]);
        toast.error("No materials found for this Purchase Order. Please ensure the PO has materials added.");
      }
    } else {
      setReceivedMaterials([]);
    }
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
      quantity: mat.expectedQuantity, // Use expected quantity (all materials received)
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
    }));

    if (itemsToSubmit.length === 0) {
      toast.error("No materials found for this Purchase Order.");
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

  const viewHistory = async (reportId: string) => {
    setSelectedReportId(reportId);
    setShowHistoryModal(true);
    setIsLoadingHistory(true);

    try {
      const response = await fetch(`/api/admin/receiving-reports/${reportId}/history`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch history");
      }
      const data = await response.json();
      setHistoryData(data);
    } catch (error: unknown) {
      console.error("Error fetching history:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoadingHistory(false);
    }
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
                    PO#: {po.poReferenceNumber} (Supplier: {po.supplier?.company_name || 'Unknown'}) - Due: {new Date(po.deliveryDate).toLocaleDateString()}
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

        <h3 className="text-lg font-medium mt-4 mb-2">Materials to Receive</h3>
        {selectedPurchaseOrderId ? (
          receivedMaterials.length === 0 ? (
            <p>No materials found for this Purchase Order or PO not selected.</p>
          ) : (
            <div className="space-y-2">
              {receivedMaterials.map((material) => (
                <div key={material.rawmaterialid} className="flex items-center space-x-2">
                  <Label className="w-48">{getRawMaterialName(material.rawmaterialid)}</Label>
                  <span className="text-sm text-gray-600">Expected Quantity: {material.expectedQuantity}</span>
                </div>
              ))}
              <p className="text-sm text-gray-600 mt-2">All expected materials will be marked as received when you create the receiving report.</p>
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
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receivingReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  
                  <td className="py-2 px-4 border-b">{report.purchaseOrder?.poReferenceNumber || 'N/A'}</td>
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
                  <td className="py-2 px-4 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewHistory(report.id)}
                    >
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receiving Report History</DialogTitle>
            <DialogDescription>
              Raw material stock changes for this receiving report
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingHistory ? (
            <div className="py-8 text-center">Loading history...</div>
          ) : historyData && historyData.history.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                <p><strong>Received Date:</strong> {new Date(historyData.receivedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
              <div className="space-y-3">
                {historyData.history.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{item.rawMaterialName}</h3>
                      <span className="text-sm text-gray-600">Quantity Received: {item.quantityReceived}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs text-gray-500 mb-1">Stock Before</p>
                        <p className="text-lg font-bold text-gray-700">{item.stockBefore}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs text-gray-500 mb-1">Stock After</p>
                        <p className="text-lg font-bold text-green-600">{item.stockAfter}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">{item.stockBefore}</span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-green-600">{item.stockAfter}</span>
                      <span className="text-gray-400 ml-2">(+{item.quantityReceived})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">No history data available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
