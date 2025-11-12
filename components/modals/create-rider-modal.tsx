"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";
import { UserProfile } from '@/types/user';
import { CreateRiderRequest } from '@/types/rider';

interface CreateRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRiderCreated: () => void;
}

export const CreateRiderModal: React.FC<CreateRiderModalProps> = ({ isOpen, onClose, onRiderCreated }) => {
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [cellphoneNumber, setCellphoneNumber] = useState("");
  const [status, setStatus] = useState<"Available" | "Not Available">("Available");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen]);

  const fetchAvailableUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch("/api/admin/riders/available-users");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch available users");
      }
      const data: UserProfile[] = await response.json();
      setAvailableUsers(data);
    } catch (error: any) {
      console.error("Error fetching available users:", error);
      toast.error(error.message || "An unknown error occurred");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!selectedUserId || !cellphoneNumber) {
      toast.error("Please select a user and enter a cellphone number");
      setIsLoading(false);
      return;
    }

    try {
      const riderData: CreateRiderRequest = {
        userId: selectedUserId,
        cellphoneNumber,
        status,
      };

      const response = await fetch("/api/admin/riders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(riderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create rider");
      }

      toast.success("Rider created successfully!");
      onRiderCreated();
      onClose();
      // Clear form
      setSelectedUserId("");
      setCellphoneNumber("");
      setStatus("Available");
    } catch (error: any) {
      console.error("Error creating rider:", error);
      toast.error(error.message || "An unknown error occurred during rider creation.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = availableUsers.find(u => u.id === selectedUserId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Rider</DialogTitle>
          <DialogDescription>
            Select a user and enter rider details. The user's role will be automatically set to "rider".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user" className="text-right">
              User
            </Label>
            <Select
              onValueChange={setSelectedUserId}
              value={selectedUserId}
              disabled={isLoadingUsers}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select a user"} />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <SelectItem value="no-users" disabled>
                    No available users
                  </SelectItem>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name} (${user.email})`
                        : user.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedUser && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm text-gray-500">
                Name
              </Label>
              <div className="col-span-3 text-sm">
                {selectedUser.first_name && selectedUser.last_name
                  ? `${selectedUser.first_name} ${selectedUser.last_name}`
                  : "N/A"}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cellphoneNumber" className="text-right">
              Cellphone Number *
            </Label>
            <Input
              id="cellphoneNumber"
              value={cellphoneNumber}
              onChange={(e) => setCellphoneNumber(e.target.value)}
              required
              placeholder="+1234567890"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              onValueChange={(value: "Available" | "Not Available") => setStatus(value)}
              value={status}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Not Available">Not Available</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading || !selectedUserId || !cellphoneNumber}>
            {isLoading ? "Creating..." : "Create Rider"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

