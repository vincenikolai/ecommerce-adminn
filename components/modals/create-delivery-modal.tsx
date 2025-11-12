"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { CreateDeliveryRequest } from '@/types/delivery';

interface CreateDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliveryCreated: () => void;
}

interface PendingOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  createdAt: string;
}

interface AvailableRider {
  id: string;
  cellphoneNumber: string;
  status: string;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export const CreateDeliveryModal: React.FC<CreateDeliveryModalProps> = ({ isOpen, onClose, onDeliveryCreated }) => {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [availableRiders, setAvailableRiders] = useState<AvailableRider[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPendingOrders();
      fetchAvailableRiders();
    }
  }, [isOpen]);

  const fetchPendingOrders = async () => {
    try {
      const response = await fetch("/api/admin/deliveries/pending-orders");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch pending orders");
      }
      const data: PendingOrder[] = await response.json();
      setPendingOrders(data);
    } catch (error: any) {
      console.error("Error fetching pending orders:", error);
      toast.error(error.message || "An unknown error occurred");
    }
  };

  const fetchAvailableRiders = async () => {
    try {
      const response = await fetch("/api/admin/deliveries/available-riders");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch available riders");
      }
      const data: AvailableRider[] = await response.json();
      setAvailableRiders(data);
    } catch (error: any) {
      console.error("Error fetching available riders:", error);
      toast.error(error.message || "An unknown error occurred");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!selectedOrderId || !selectedRiderId || !deliveryDate) {
      toast.error("Please select an order, rider, and delivery date");
      setIsLoading(false);
      return;
    }

    try {
      const deliveryData: CreateDeliveryRequest = {
        orderId: selectedOrderId,
        riderId: selectedRiderId,
        deliveryDate,
        quantity,
        notes: notes || undefined,
      };

      const response = await fetch("/api/admin/deliveries/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deliveryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create delivery");
      }

      toast.success("Delivery created successfully! Order status updated to 'On Delivery'.");
      onDeliveryCreated();
      onClose();
      // Clear form
      setSelectedOrderId("");
      setSelectedRiderId("");
      setDeliveryDate(new Date().toISOString().split('T')[0]);
      setQuantity(1);
      setNotes("");
    } catch (error: any) {
      console.error("Error creating delivery:", error);
      toast.error(error.message || "An unknown error occurred during delivery creation.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOrder = pendingOrders.find(o => o.id === selectedOrderId);
  const selectedRider = availableRiders.find(r => r.id === selectedRiderId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Delivery</DialogTitle>
          <DialogDescription>
            Assign a pending order to an available rider. The order status will be updated to "On Delivery".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="order" className="text-right">
              Order *
            </Label>
            <Select
              onValueChange={setSelectedOrderId}
              value={selectedOrderId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a pending order" />
              </SelectTrigger>
              <SelectContent>
                {pendingOrders.length === 0 ? (
                  <SelectItem value="no-orders" disabled>
                    No pending orders available
                  </SelectItem>
                ) : (
                  pendingOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNumber} - {order.customerName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedOrder && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm text-gray-500">
                Customer
              </Label>
              <div className="col-span-3 text-sm">
                {selectedOrder.customerName}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rider" className="text-right">
              Rider *
            </Label>
            <Select
              onValueChange={setSelectedRiderId}
              value={selectedRiderId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an available rider" />
              </SelectTrigger>
              <SelectContent>
                {availableRiders.length === 0 ? (
                  <SelectItem value="no-riders" disabled>
                    No available riders
                  </SelectItem>
                ) : (
                  availableRiders.map((rider) => (
                    <SelectItem key={rider.id} value={rider.id}>
                      {rider.user.first_name && rider.user.last_name
                        ? `${rider.user.first_name} ${rider.user.last_name}`
                        : rider.user.email} - {rider.cellphoneNumber}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedRider && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-sm text-gray-500">
                Contact
              </Label>
              <div className="col-span-3 text-sm">
                {selectedRider.cellphoneNumber}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deliveryDate" className="text-right">
              Delivery Date *
            </Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional delivery notes..."
              className="col-span-3"
            />
          </div>

          <Button type="submit" disabled={isLoading || !selectedOrderId || !selectedRiderId || !deliveryDate}>
            {isLoading ? "Creating..." : "Create Delivery"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

