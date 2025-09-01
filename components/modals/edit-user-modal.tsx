"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  ban_duration: string | null;
  is_admin: boolean;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onUserUpdated }) => {
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [isAdmin, setIsAdmin] = useState(user.is_admin);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setIsAdmin(user.is_admin);
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
        body: JSON.stringify({ userId: user.id, firstName, lastName, isAdmin }),
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
            <Label htmlFor="editIsAdmin" className="text-right">
              Admin
            </Label>
            <input
              id="editIsAdmin"
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="col-span-3"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
