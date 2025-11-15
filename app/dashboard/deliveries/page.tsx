'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { CreateDeliveryModal } from '@/components/modals/create-delivery-modal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Delivery } from '@/types/delivery';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const DELIVERY_MANAGER_ROLE: UserRole = "delivery_manager";

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const [showCreateDeliveryModal, setShowCreateDeliveryModal] = useState(false);
  const [sortBy, setSortBy] = useState<"created_at" | "delivery_date" | "order_number">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const getSessionAndRole = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        toast.error("Error fetching session: " + error.message);
        setIsLoading(false);
        return;
      }
      setSession(session);

      if (session) {
        // Fetch user profile to get role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Error fetching user role: " + profileError.message);
        } else if (profile) {
          setUserRole(profile.role as UserRole);
        }
      }
      setIsLoading(false);
    };

    getSessionAndRole();
  }, [supabase.auth]);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: sortBy,
        sortOrder: sortOrder,
        status: statusFilter,
      }).toString();
      const response = await fetch(`/api/admin/deliveries/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch deliveries");
      }
      const data: Delivery[] = await response.json();
      setDeliveries(data);
    } catch (error: unknown) {
      console.error("Error in fetchDeliveries:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && (session.user?.email === ADMIN_EMAIL || userRole === DELIVERY_MANAGER_ROLE)) {
      fetchDeliveries();
    }
  }, [session, userRole, sortBy, sortOrder, statusFilter]);

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!window.confirm("Are you sure you want to delete this delivery? The order status will be reset to 'Pending'.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/deliveries/delete?id=${deliveryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete delivery");
      }

      toast.success("Delivery deleted successfully! Order status reset to 'Pending'.");
      fetchDeliveries();
    } catch (error: unknown) {
      console.error("Error deleting delivery:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const handleStatusChange = async (deliveryId: string, newStatus: "Assigned" | "In Transit" | "Delivered" | "Failed") => {
    try {
      const response = await fetch(`/api/admin/deliveries/update?id=${deliveryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update delivery status");
      }

      toast.success("Delivery status updated successfully!");
      fetchDeliveries();
    } catch (error: unknown) {
      console.error("Error updating delivery status:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-100 text-blue-800';
      case 'In Transit':
        return 'bg-yellow-100 text-yellow-800';
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateOnly = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading delivery data...</div>;
  }

  if (!session || (session.user?.email !== ADMIN_EMAIL && userRole !== DELIVERY_MANAGER_ROLE)) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Delivery Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Delivery Management</h1>
        <Button onClick={() => setShowCreateDeliveryModal(true)}>Assign New Delivery</Button>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <Label htmlFor="statusFilter">Filter by Status</Label>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Deliveries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deliveries</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="In Transit">In Transit</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select onValueChange={(value: "created_at" | "delivery_date" | "order_number") => setSortBy(value)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="delivery_date">Delivery Date</SelectItem>
              <SelectItem value="order_number">Order Number</SelectItem>
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
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-600">Total Deliveries</p>
          <p className="text-2xl font-bold">{deliveries.length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <p className="text-sm text-blue-800">Assigned</p>
          <p className="text-2xl font-bold text-blue-900">
            {deliveries.filter(d => d.status === 'Assigned').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <p className="text-sm text-yellow-800">In Transit</p>
          <p className="text-2xl font-bold text-yellow-900">
            {deliveries.filter(d => d.status === 'In Transit').length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <p className="text-sm text-green-800">Delivered</p>
          <p className="text-2xl font-bold text-green-900">
            {deliveries.filter(d => d.status === 'Delivered').length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <p className="text-sm text-red-800">Failed</p>
          <p className="text-2xl font-bold text-red-900">
            {deliveries.filter(d => d.status === 'Failed').length}
          </p>
        </div>
      </div>

      {/* Deliveries Table */}
      {deliveries.length === 0 ? (
        <p>No deliveries found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 border-b text-left font-semibold">Delivery ID</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Order Number</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Customer Name</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Rider</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Delivery Date</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Quantity</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Status</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Date Created</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{delivery.id.substring(0, 8)}...</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{delivery.orderNumber}</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{delivery.customerName}</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="text-sm">
                      {delivery.rider?.user?.first_name && delivery.rider?.user?.last_name
                        ? `${delivery.rider.user.first_name} ${delivery.rider.user.last_name}`
                        : delivery.rider?.user?.email || "N/A"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {delivery.rider?.cellphoneNumber || "N/A"}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {formatDateOnly(delivery.deliveryDate)}
                  </td>
                  <td className="py-3 px-4 border-b">
                    {delivery.totalQuantity || 0} item(s)
                  </td>
                  <td className="py-3 px-4 border-b">
                    <Select
                      value={delivery.status}
                      onValueChange={(value: "Assigned" | "In Transit" | "Delivered" | "Failed") => handleStatusChange(delivery.id, value)}
                    >
                      <SelectTrigger className={`w-[140px] ${getStatusBadgeColor(delivery.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {formatDate(delivery.createdAt)}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDelivery(delivery.id)}
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

      <CreateDeliveryModal
        isOpen={showCreateDeliveryModal}
        onClose={() => setShowCreateDeliveryModal(false)}
        onDeliveryCreated={() => {
          setShowCreateDeliveryModal(false);
          fetchDeliveries();
        }}
      />
    </div>
  );
}

