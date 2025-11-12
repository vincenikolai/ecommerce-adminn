"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";
import { Rider } from '@/types/rider';

interface EditRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  rider: Rider;
  onRiderUpdated: () => void;
}

export const EditRiderModal: React.FC<EditRiderModalProps> = ({ isOpen, onClose, rider, onRiderUpdated }) => {
  const [cellphoneNumber, setCellphoneNumber] = useState(rider.cellphoneNumber);
  const [status, setStatus] = useState<"Available" | "Not Available">(rider.status);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (rider) {
      setCellphoneNumber(rider.cellphoneNumber);
      setStatus(rider.status);
    }
  }, [rider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!cellphoneNumber) {
      toast.error("Cellphone number is required");
      setIsLoading(false);
      return;
    }

    try {
      const updateData = {
        cellphoneNumber,
        status,
      };

      const response = await fetch(`/api/admin/riders/update?id=${rider.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update rider");
      }

      toast.success("Rider updated successfully!");
      onRiderUpdated();
      onClose();
    } catch (error: any) {
      console.error("Error updating rider:", error);
      toast.error(error.message || "An unknown error occurred during rider update.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Rider</DialogTitle>
          <DialogDescription>
            Update rider information. User details cannot be changed here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm text-gray-500">
              Name
            </Label>
            <div className="col-span-3 text-sm">
              {rider.user?.first_name && rider.user?.last_name
                ? `${rider.user.first_name} ${rider.user.last_name}`
                : rider.user?.email || "N/A"}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm text-gray-500">
              Email
            </Label>
            <div className="col-span-3 text-sm">
              {rider.user?.email || "N/A"}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editCellphoneNumber" className="text-right">
              Cellphone Number *
            </Label>
            <Input
              id="editCellphoneNumber"
              value={cellphoneNumber}
              onChange={(e) => setCellphoneNumber(e.target.value)}
              required
              placeholder="+1234567890"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editStatus" className="text-right">
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

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Rider"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

