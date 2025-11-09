'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { CreateUserModal } from '@/components/modals/create-user-modal';
import { EditUserModal } from '@/components/modals/edit-user-modal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfile, UserRole } from '@/types/user'; // Import UserProfile and UserRole

const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [sortBy, setSortBy] = useState<"email" | "role" | "created_at">("email");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        toast.error("Error fetching session: " + error.message);
      } else {
        setSession(session);
      }
      setIsLoading(false);
    };

    getSession();
  }, [supabase.auth]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: sortBy,
        sortOrder: sortOrder,
      }).toString();
      const response = await fetch(`/api/admin/users/list?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch users");
      }
      const data: UserProfile[] = await response.json();
      // Filter out the admin user from the list
      setUsers(data.filter(user => user.email !== ADMIN_EMAIL));
    } catch (error: unknown) {
      console.error("Error in fetchUsers:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && session.user?.email === ADMIN_EMAIL) {
      fetchUsers();
    }
  }, [session, sortBy, sortOrder]);

  const handleBlockUnblock = async (userId: string, ban_duration: string) => {
    // Prevent blocking the admin user
    const userToBlock = users.find(user => user.id === userId);
    if (userToBlock && userToBlock.email === ADMIN_EMAIL) {
      toast.error("The primary administrator cannot be blocked.");
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ban_duration }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user status');
      }

      toast.success(`User ${ban_duration === 'none' ? 'unblocked' : 'blocked'} successfully!`);
      fetchUsers(); // Refresh the user list
    } catch (error: unknown) {
      toast.error("Error: " + (error instanceof Error ? error.message : "An unknown error occurred"));
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  if (isLoading) {
    return <div className="p-6">Loading user data...</div>;
  }

  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return <div className="p-6 text-red-500">Access Denied: You do not have administrator privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <Button onClick={() => setShowCreateUserModal(true)} className="mb-4">Create New User</Button>

      <div className="flex space-x-4 mb-4">
        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <Select onValueChange={(value: "email" | "role" | "created_at") => setSortBy(value)} value={sortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email (Alphabetical)</SelectItem>
              <SelectItem value="role">Role</SelectItem>
              <SelectItem value="created_at">Date Created</SelectItem>
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
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr><th className="py-2 px-4 border-b text-left">Email</th><th className="py-2 px-4 border-b text-left">First Name</th><th className="py-2 px-4 border-b text-left">Last Name</th><th className="py-2 px-4 border-b text-left">Role</th><th className="py-2 px-4 border-b text-left">Status</th><th className="py-2 px-4 border-b text-left">Actions</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{user.email}</td>
                  <td className="py-2 px-4 border-b">{user.first_name || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{user.last_name || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace("_", " ")} {/* Display Role */}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {user.ban_duration === null || user.ban_duration === 'none' ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Blocked
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b space-x-2">
                    {user.ban_duration === 'blocked' ? (
                      <Button onClick={() => handleBlockUnblock(user.id, 'unblocked')}>Unblock</Button>
                    ) : (
                      <Button onClick={() => handleBlockUnblock(user.id, 'blocked')} variant="destructive">
                        Block
                      </Button>
                    )}
                    <Button onClick={() => handleEditUser(user)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onUserCreated={() => {
          setShowCreateUserModal(false);
          fetchUsers();
        }}
      />
      {selectedUser && (
        <EditUserModal
          isOpen={showEditUserModal}
          onClose={() => setShowEditUserModal(false)}
          user={selectedUser}
          onUserUpdated={() => {
            setShowEditUserModal(false);
            fetchUsers();
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
