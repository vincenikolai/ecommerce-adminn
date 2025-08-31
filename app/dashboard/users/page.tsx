'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  ban_duration: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const supabase = createClientComponentClient();

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users/list');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

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
