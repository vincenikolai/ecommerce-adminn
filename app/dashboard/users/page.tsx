'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  ban_duration: string | null;
  is_admin: boolean; // Add is_admin property
}

const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

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
      const response = await fetch("/api/admin/users/list");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch users");
      }
      const data: UserProfile[] = await response.json();
      setUsers(data);
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
  }, [session]);

  const handleBlockUnblock = async (userId: string, ban_duration: string) => {
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

  if (isLoading) {
    return <div className="p-6">Loading user data...</div>;
  }

  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return <div className="p-6 text-red-500">Access Denied: You do not have administrator privileges to view this page.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left">Email</th>
                <th className="py-2 px-4 border-b text-left">First Name</th>
                <th className="py-2 px-4 border-b text-left">Last Name</th>
                <th className="py-2 px-4 border-b text-left">Status</th>
                <th className="py-2 px-4 border-b text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{user.email}</td>
                  <td className="py-2 px-4 border-b">{user.first_name || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">{user.last_name || 'N/A'}</td>
                  <td className="py-2 px-4 border-b">
                    {user.ban_duration === null || user.ban_duration === 'none' ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Blocked ({user.ban_duration})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b space-x-2">
                    <Button onClick={() => handleBlockUnblock(user.id, '24h')} variant="destructive">
                      Block (24h)
                    </Button>
                    <Button onClick={() => handleBlockUnblock(user.id, 'none')}>Unblock</Button>
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
