'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { CreateRiderModal } from '@/components/modals/create-rider-modal';
import { EditRiderModal } from '@/components/modals/edit-rider-modal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Rider } from '@/types/rider';
import { UserRole } from '@/types/user';

const ADMIN_EMAIL = "eastlachemicals@gmail.com";
const RIDER_MANAGER_ROLE: UserRole = "rider_manager";

export default function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const [showCreateRiderModal, setShowCreateRiderModal] = useState(false);
  const [showEditRiderModal, setShowEditRiderModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [sortBy, setSortBy] = useState<"created_at" | "cellphone_number" | "status">("created_at");
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

  const fetchRiders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: sortBy,
        sortOrder: sortOrder,
        status: statusFilter,
      }).toString();
      const response = await fetch(`/api/admin/riders/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch riders");
      }
      const data: Rider[] = await response.json();
      setRiders(data);
    } catch (error: unknown) {
      console.error("Error in fetchRiders:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && (session.user?.email === ADMIN_EMAIL || userRole === RIDER_MANAGER_ROLE)) {
      fetchRiders();
    }
  }, [session, userRole, sortBy, sortOrder, statusFilter]);

  const handleDeleteRider = async (riderId: string) => {
    if (!window.confirm("Are you sure you want to delete this rider? This will not delete the user account.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/riders/delete?id=${riderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete rider");
      }

      toast.success("Rider deleted successfully!");
      fetchRiders();
    } catch (error: unknown) {
      console.error("Error deleting rider:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const handleEditRider = (rider: Rider) => {
    setSelectedRider(rider);
    setShowEditRiderModal(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'Not Available':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading rider data...</div>;
  }

  if (!session || (session.user?.email !== ADMIN_EMAIL && userRole !== RIDER_MANAGER_ROLE)) {
    return <div className="p-6 text-red-500">Access Denied: You do not have "Rider's Manager" privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rider Management</h1>
        <Button onClick={() => setShowCreateRiderModal(true)}>Add New Rider</Button>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <Label htmlFor="statusFilter">Filter by Status</Label>
          <Select onValueChange={setStatusFilter} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Riders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Riders</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Not Available">Not Available</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select onValueChange={(value: "created_at" | "cellphone_number" | "status") => setSortBy(value)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="cellphone_number">Cellphone Number</SelectItem>
              <SelectItem value="status">Status</SelectItem>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-sm text-gray-600">Total Riders</p>
          <p className="text-2xl font-bold">{riders.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <p className="text-sm text-green-800">Available</p>
          <p className="text-2xl font-bold text-green-900">
            {riders.filter(r => r.status === 'Available').length}
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <p className="text-sm text-red-800">Not Available</p>
          <p className="text-2xl font-bold text-red-900">
            {riders.filter(r => r.status === 'Not Available').length}
          </p>
        </div>
      </div>

      {/* Riders Table */}
      {riders.length === 0 ? (
        <p>No riders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-3 px-4 border-b text-left font-semibold">Rider ID</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Name</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Email</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Cellphone Number</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Status</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Date Added</th>
                <th className="py-3 px-4 border-b text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {riders.map((rider) => (
                <tr key={rider.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">{rider.id.substring(0, 8)}...</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="font-medium">
                      {rider.user?.first_name && rider.user?.last_name
                        ? `${rider.user.first_name} ${rider.user.last_name}`
                        : rider.user?.email || "N/A"}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="text-sm text-gray-600">{rider.user?.email || "N/A"}</div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <a href={`tel:${rider.cellphoneNumber}`} className="text-blue-600 hover:underline">
                      {rider.cellphoneNumber}
                    </a>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <Badge className={getStatusBadgeColor(rider.status)}>
                      {rider.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 border-b text-sm">
                    {formatDate(rider.createdAt)}
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRider(rider)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteRider(rider.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateRiderModal
        isOpen={showCreateRiderModal}
        onClose={() => setShowCreateRiderModal(false)}
        onRiderCreated={() => {
          setShowCreateRiderModal(false);
          fetchRiders();
        }}
      />
      {selectedRider && (
        <EditRiderModal
          isOpen={showEditRiderModal}
          onClose={() => {
            setShowEditRiderModal(false);
            setSelectedRider(null);
          }}
          rider={selectedRider}
          onRiderUpdated={() => {
            setShowEditRiderModal(false);
            fetchRiders();
            setSelectedRider(null);
          }}
        />
      )}
    </div>
  );
}

