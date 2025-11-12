"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";
import { UserProfile, UserRole } from '@/types/user'; // Import UserProfile and UserRole

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onUserUpdated }) => {
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [role, setRole] = useState<UserRole>(user.role); // Initialize with user's role
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setRole(user.role); // Update role when user changes
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id, firstName, lastName, role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      toast.success("User updated successfully!");
      onUserUpdated();
      onClose();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "An unknown error occurred during user update.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.email}</DialogTitle>
          <DialogDescription>
            Update the user's first name, last name, and admin status.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editFirstName" className="text-right">
              First Name
            </Label>
            <Input
              id="editFirstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editLastName" className="text-right">
              Last Name
            </Label>
            <Input
              id="editLastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editRole" className="text-right">
              Role
            </Label>
            <Select onValueChange={(value: UserRole) => setRole(value)} value={role}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="raw_material_manager">Raw Material Manager</SelectItem>
                <SelectItem value="purchasing_manager">Purchasing Manager</SelectItem>
                <SelectItem value="supplier_management_manager">Supplier Management Manager</SelectItem>
                <SelectItem value="order_manager">Order Manager</SelectItem>
                <SelectItem value="sales_manager">Sales Manager</SelectItem>
                <SelectItem value="warehouse_staff">Warehouse Staff</SelectItem>
                <SelectItem value="finance_manager">Finance Manager</SelectItem>
                <SelectItem value="production_manager">Production Manager</SelectItem>
                <SelectItem value="sales_staff">Sales Staff</SelectItem>
                <SelectItem value="rider">Rider</SelectItem>
                <SelectItem value="rider_manager">Rider's Manager</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
