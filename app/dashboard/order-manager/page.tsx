'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { UserProfile, UserRole } from '@/types/user';
import { Order, OrderStatusHistory } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SALES_MANAGER_ROLE: UserRole = "sales_manager";

export default function OrderManagerPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const supabase = createClientComponentClient();
  
  // Filters and sorting
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'orderNumber' | 'customerName' | 'totalAmount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Status history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        sortBy: sortBy,
        sortOrder: sortOrder,
      }).toString();
      
      const response = await fetch(`/api/admin/orders/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch orders");
      }
      const data: Order[] = await response.json();
      setOrders(data);
    } catch (error: unknown) {
      console.error("Error in fetchOrders:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && userRole === SALES_MANAGER_ROLE) {
      fetchOrders();
    }
  }, [session, userRole, statusFilter, sortBy, sortOrder]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update order status");
      }

      toast.success("Order status updated successfully!");
      fetchOrders(); // Refresh the list
    } catch (error: unknown) {
      console.error("Error updating order status:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const viewStatusHistory = async (order: Order) => {
    setSelectedOrder(order);
    setShowHistoryModal(true);
    setIsLoadingHistory(true);

    try {
      const response = await fetch(`/api/admin/orders/${order.id}/history`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch status history");
      }
      const data: OrderStatusHistory[] = await response.json();
      setStatusHistory(data);
    } catch (error: unknown) {
      console.error("Error fetching status history:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Quoted':
        return 'bg-purple-100 text-purple-800';
      case 'Paid':
        return 'bg-blue-100 text-blue-800';
      case 'On Delivery':
        return 'bg-orange-100 text-orange-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading order data...</div>;
  }

  if (!session || userRole !== SALES_MANAGER_ROLE) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Sales Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Order Management</h1>

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
              <SelectItem value="Quoted">Quoted</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="On Delivery">On Delivery</SelectItem>
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
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="orderNumber">Order Number</SelectItem>
              <SelectItem value="customerName">Customer Name</SelectItem>
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold">{orders.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
          <p className="text-sm text-yellow-800">Pending</p>
          <p className="text-2xl font-bold text-yellow-900">
            {orders.filter(o => o.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow border border-purple-200">
          <p className="text-sm text-purple-800">Quoted</p>
          <p className="text-2xl font-bold text-purple-900">
            {orders.filter(o => o.status === 'Quoted').length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <p className="text-sm text-blue-800">Paid</p>
          <p className="text-2xl font-bold text-blue-900">
            {orders.filter(o => o.status === 'Paid').length}
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg shadow border border-orange-200">
          <p className="text-sm text-orange-800">On Delivery</p>
          <p className="text-2xl font-bold text-orange-900">
            {orders.filter(o => o.status === 'On Delivery').length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <p className="text-sm text-green-800">Completed</p>
          <p className="text-2xl font-bold text-green-900">
            {orders.filter(o => o.status === 'Completed').length}
          </p>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 border-b text-left font-semibold">Order #</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Customer</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Date</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Total</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Status</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500">{order.id.substring(0, 8)}...</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerEmail}</div>
                  </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 px-4 border-b font-medium">
                    ₱{order.totalAmount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <Select
                      value={order.status}
                      onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                    >
                      <SelectTrigger className={`w-[140px] ${getStatusBadgeColor(order.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="On Delivery">On Delivery</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewStatusHistory(order)}
                    >
                      View History
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Status History</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Order #${selectedOrder.orderNumber}`}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingHistory ? (
            <div className="py-8 text-center">Loading history...</div>
          ) : statusHistory.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No status changes recorded yet.</div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {statusHistory.map((history, index) => (
                <div key={history.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {history.oldstatus && (
                        <>
                          <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(history.oldstatus)}`}>
                            {history.oldstatus}
                          </span>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeColor(history.newstatus)}`}>
                        {history.newstatus}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Changed by: <span className="font-medium">{history.changedby}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(history.changedat)}
                    </div>
                    {history.notes && (
                      <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {history.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
