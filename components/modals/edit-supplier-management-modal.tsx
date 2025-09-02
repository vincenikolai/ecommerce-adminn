"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { SupplierManagementItem } from '@/types/supplier-management'; // Renamed type import

interface EditSupplierManagementModalProps { // Renamed interface
  isOpen: boolean;
  onClose: () => void;
  product: SupplierManagementItem; // Changed type
  onProductUpdated: (updatedProduct: SupplierManagementItem) => void; // Changed type
}

export const EditSupplierManagementModal: React.FC<EditSupplierManagementModalProps> = ({ isOpen, onClose, product, onProductUpdated }) => { // Renamed component
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState<number>(product.price);
  const [stock, setStock] = useState<number>(product.stock);
  const [supplierShop, setSupplierShop] = useState(product.supplier_shop || ""); // New state for supplier shop
  const [date, setDate] = useState(product.date || ""); // New state for date
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price);
      setStock(product.stock);
      setSupplierShop(product.supplier_shop || ""); // Initialize new field
      setDate(product.date || ""); // Initialize new field
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/supplier-management/update", { // Updated API endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: product.id, name, description, price, stock, supplier_shop: supplierShop, date }), // Added new fields
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update supplier management item"); // Updated error message
      }

      const responseData = await response.json();
      toast.success("Supplier management item updated successfully!"); // Updated success message
      onProductUpdated(responseData.product);
      onClose();
    } catch (error: any) {
      console.error("Error updating supplier management item:", error); // Updated console error
      toast.error(error.message || "An unknown error occurred during supplier management item update."); // Updated toast error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Supplier Management Item: {product.name}</DialogTitle>
          <DialogDescription>
            Update the details for the supplier management item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editName" className="text-left">
              Item Name
            </Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editDescription" className="text-left">
              Description
            </Label>
            <Input
              id="editDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editPrice" className="text-left">
              Price
            </Label>
            <Input
              id="editPrice"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value === '' ? 0 : parseFloat(e.target.value))}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editStock" className="text-left">
              Stock
            </Label>
            <Input
              id="editStock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
              required
              className="col-span-2"
            />
          </div>
          {/* New fields for supplier shop and date */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editSupplierShop" className="text-left">
              Supplier Shop
            </Label>
            <Input
              id="editSupplierShop"
              value={supplierShop}
              onChange={(e) => setSupplierShop(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editDate" className="text-left">
              Date
            </Label>
            <Input
              id="editDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Supplier Management Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
