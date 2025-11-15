'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Delivery } from '@/types/delivery';
import { Card } from '@/components/ui/card';
import { MapPin, Package, Phone, Calendar, CheckCircle, Truck } from 'lucide-react';
import { UserRole } from '@/types/user';

const RIDER_ROLE: UserRole = "rider";

export default function RiderPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
      const response = await fetch('/api/rider/deliveries');
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
    if (session) {
      fetchDeliveries();
    }
  }, [session, statusFilter]);

  const handleStatusUpdate = async (deliveryId: string, newStatus: "In Transit" | "Delivered") => {
    try {
      const response = await fetch('/api/rider/deliveries/update-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deliveryId, newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update delivery status");
      }

      const result = await response.json();
      toast.success(result.message || "Delivery status updated successfully!");
      fetchDeliveries(); // Refresh deliveries
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

  const formatAddress = (address: any) => {
    if (!address || typeof address !== 'object') return 'N/A';
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  if (isLoading) {
    return <div className="p-6">Loading your deliveries...</div>;
  }

  if (!session) {
    return <div className="p-6 text-red-500">Please log in to view your deliveries.</div>;
  }

  if (userRole !== RIDER_ROLE) {
    return (
      <div className="p-6 text-red-500">
        Access Denied: You do not have "Rider" privileges to view this page.
      </div>
    );
  }

  // Filter deliveries by status
  const filteredDeliveries = statusFilter === 'all' 
    ? deliveries 
    : deliveries.filter(d => d.status === statusFilter);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Deliveries</h1>
        <Button variant="outline" onClick={fetchDeliveries}>
          Refresh
        </Button>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mr-2">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Deliveries</option>
          <option value="Assigned">Assigned</option>
          <option value="In Transit">In Transit</option>
          <option value="Delivered">Delivered</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
      </div>

      {/* Deliveries List */}
      {filteredDeliveries.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No deliveries found
          </h2>
          <p className="text-gray-600">
            {statusFilter === "all"
              ? "You don't have any deliveries assigned yet."
              : `No deliveries found with status "${statusFilter}".`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDeliveries.map((delivery) => (
            <Card key={delivery.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{delivery.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Customer: {delivery.customerName}
                  </p>
                </div>
                <Badge className={getStatusBadgeColor(delivery.status)}>
                  {delivery.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start space-x-2">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Delivery Date</p>
                    <p className="text-sm text-gray-600">{formatDate(delivery.deliveryDate)}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <Package className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Quantity</p>
                    <p className="text-sm text-gray-600">{delivery.totalQuantity || 0} item(s)</p>
                  </div>
                </div>
              </div>

              {delivery.order?.shippingAddress && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                      <p className="text-sm text-gray-600">
                        {formatAddress(delivery.order.shippingAddress)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {delivery.notes && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium text-blue-800">Notes</p>
                  <p className="text-sm text-blue-700">{delivery.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                {delivery.status === 'Assigned' && (
                  <Button
                    onClick={() => handleStatusUpdate(delivery.id, 'In Transit')}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Start Delivery (In Transit)
                  </Button>
                )}
                {(delivery.status === 'Assigned' || delivery.status === 'In Transit') && (
                  <Button
                    onClick={() => handleStatusUpdate(delivery.id, 'Delivered')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}
                {delivery.status === 'Delivered' && (
                  <div className="text-sm text-green-600 font-medium flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Delivery Completed
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

