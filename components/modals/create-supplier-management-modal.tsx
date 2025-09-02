"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { SupplierManagementItem } from '@/types/supplier-management'; // Renamed type import

interface CreateSupplierManagementModalProps { // Renamed interface
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (newProduct: SupplierManagementItem) => void; // Changed type
}

export const CreateSupplierManagementModal: React.FC<CreateSupplierManagementModalProps> = ({ isOpen, onClose, onProductCreated }) => { // Renamed component
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [supplierShop, setSupplierShop] = useState(""); // New state for supplier shop
  const [date, setDate] = useState(""); // New state for date
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/supplier-management/create", { // Updated API endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description, price, stock, supplier_shop: supplierShop, date }), // Added new fields
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create supplier management item"); // Updated error message
      }

      const responseData = await response.json();
      toast.success("Supplier management item created successfully!"); // Updated success message
      onProductCreated(responseData.product);
      onClose();
      // Clear form
      setName("");
      setDescription("");
      setPrice(0);
      setStock(0);
      setSupplierShop(""); // Clear new field
      setDate(""); // Clear new field
    } catch (error: any) {
      console.error("Error creating supplier management item:", error); // Updated console error
      toast.error(error.message || "An unknown error occurred during supplier management item creation."); // Updated toast error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Supplier Management Item</DialogTitle>
          <DialogDescription>
            Enter the details for the new supplier management item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="name" className="text-left">
              Item Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="description" className="text-left">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="price" className="text-left">
              Price
            </Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value === '' ? 0 : parseFloat(e.target.value))}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="stock" className="text-left">
              Stock
            </Label>
            <Input
              id="stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
              required
              className="col-span-2"
            />
          </div>
          {/* New fields for supplier shop and date */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="supplierShop" className="text-left">
              Supplier Shop
            </Label>
            <Input
              id="supplierShop"
              value={supplierShop}
              onChange={(e) => setSupplierShop(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="date" className="text-left">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Supplier Management Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
