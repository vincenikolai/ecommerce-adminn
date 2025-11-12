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
  const [companyName, setCompanyName] = useState(product.company_name || product.supplier_shop || "");
  const [contactPerson, setContactPerson] = useState(product.contact_person || "");
  const [email, setEmail] = useState(product.email || "");
  const [phone, setPhone] = useState(product.phone || "");
  const [address, setAddress] = useState(product.address || "");
  const [notes, setNotes] = useState(product.notes || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setCompanyName(product.company_name || product.supplier_shop || "");
      setContactPerson(product.contact_person || "");
      setEmail(product.email || "");
      setPhone(product.phone || "");
      setAddress(product.address || "");
      setNotes(product.notes || "");
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
        body: JSON.stringify({ 
          id: product.id, 
          company_name: companyName,
          contact_person: contactPerson,
          email,
          phone,
          address,
          notes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update supplier");
      }

      const responseData = await response.json();
      toast.success("Supplier updated successfully!");
      onProductUpdated(responseData.supplier);
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
          <DialogTitle>Edit Supplier: {companyName}</DialogTitle>
          <DialogDescription>
            Update the supplier information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editCompanyName" className="text-left">
              Company Name *
            </Label>
            <Input
              id="editCompanyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editContactPerson" className="text-left">
              Contact Person
            </Label>
            <Input
              id="editContactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editEmail" className="text-left">
              Email
            </Label>
            <Input
              id="editEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editPhone" className="text-left">
              Phone
            </Label>
            <Input
              id="editPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editAddress" className="text-left">
              Address
            </Label>
            <Input
              id="editAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editNotes" className="text-left">
              Notes
            </Label>
            <Input
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-2"
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Supplier"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
