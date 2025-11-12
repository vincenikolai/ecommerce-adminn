"use client";

import { useEffect, useState } from "react";
import {
  createClientComponentClient,
  Session,
} from "@supabase/auth-helpers-nextjs";
import toast from "react-hot-toast";
import { UserProfile, UserRole } from "@/types/user";
import { Button } from "@/components/ui/button";
import { PurchaseQuotation } from "@/types/purchase-quotation";
import { SupplierManagementItem } from "@/types/supplier-management";
import { RawMaterial } from "@/types/raw-material";
import { PurchaseOrder } from "@/types/purchase-order"; // Import PurchaseOrder type

const SALES_QUOTATION_MANAGER_ROLE: UserRole = "sales_quotation_manager";

export default function SalesOrderPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();

  const [salesOrders, setSalesOrders] = useState<PurchaseOrder[]>([]); // Changed type to PurchaseOrder[]
  const [suppliers, setSuppliers] = useState<SupplierManagementItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);

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
      const response = await fetch("/api/admin/raw-materials/list");
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

  const fetchSalesOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "/api/admin/purchase-orders/list"
      ); // Use the dedicated PurchaseOrder list API
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch sales orders");
      }
      const data: PurchaseOrder[] = await response.json(); // Cast to PurchaseOrder[]
      setSalesOrders(data);
    } catch (error: unknown) {
      console.error("Error fetching sales orders:", error);
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
      fetchSalesOrders();
    }
  }, [session, userRole]);

  const handleDeleteSalesOrder = async (orderId: string) => {
    if (
      !window.confirm("Are you sure you want to delete this sales order?")
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/purchase-orders/delete?id=${orderId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete sales order");
      }

      toast.success("Sales order deleted!");
      fetchSalesOrders(); // Re-fetch sales orders after deletion
    } catch (error: unknown) {
      console.error("Error deleting sales order:", error);
      toast.error(
        "Error deleting sales order: " +
          (error instanceof Error ? error.message : "An unknown error occurred")
      );
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading sales order data...</div>;
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

  const getSupplierName = (id: string) => {
    return (
      suppliers.find((s) => s.id === id)?.supplier_shop || "Unknown Supplier"
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sales Order Management</h1>

      <h2 className="text-xl font-semibold mb-4 mt-8">Existing Sales Orders</h2>
      {salesOrders.length === 0 ? (
        <p>No sales orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">PO Number</th>
                <th className="py-2 px-4 border-b text-left">Supplier</th>
                <th className="py-2 px-4 border-b text-left">Order Date</th>
                <th className="py-2 px-4 border-b text-left">Delivery Date</th>
                <th className="py-2 px-4 border-b text-left">Total Amount</th>
                <th className="py-2 px-4 border-b text-left">Materials</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders.map((salesOrder) => (
                <tr key={salesOrder.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">
                    {salesOrder.poReferenceNumber || "N/A"}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {salesOrder.supplier?.company_name || salesOrder.supplier?.supplier_shop || "Unknown Supplier"}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {new Date(salesOrder.orderDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {new Date(salesOrder.deliveryDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border-b">
                    ₱{(salesOrder.totalAmount ?? 0).toFixed(2)}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <ul className="list-disc list-inside">
                      {salesOrder.materials?.map((material) => (
                        <li key={material.id || material.rawmaterialid}>
                          {getRawMaterialName(material.rawmaterialid)} x{" "}
                          {material.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2 px-4 border-b space-x-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteSalesOrder(salesOrder.id)}
                    >
                      Delete
                    </Button>
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
