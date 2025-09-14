import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { RawMaterial } from '@/types/raw-material';
import { SupplierManagementItem } from '@/types/supplier-management';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";


interface CreateRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRawMaterialCreated: (newRawMaterial: RawMaterial) => void;
}

export const CreateRawMaterialModal: React.FC<CreateRawMaterialModalProps> = ({ isOpen, onClose, onRawMaterialCreated }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  const [stock, setStock] = useState<number>(0);
  const [defaultSupplierId, setDefaultSupplierId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierManagementItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchSuppliers = async () => {
        try {
          const response = await fetch("/api/admin/supplier-management/list"); // Assuming this lists all suppliers
          if (!response.ok) {
            throw new Error("Failed to fetch suppliers");
          }
          const data: SupplierManagementItem[] = await response.json();
          setSuppliers(data);
        } catch (error) {
          console.error("Error fetching suppliers:", error);
          toast.error("Failed to load suppliers.");
        }
      };
      fetchSuppliers();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/raw-materials/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, category, unitOfMeasure, stock, defaultSupplierId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create raw material");
      }

      const responseData = await response.json();
      toast.success("Raw material created successfully!");
      onRawMaterialCreated(responseData.rawMaterial);
      onClose();
      // Clear form
      setName("");
      setCategory("");
      setUnitOfMeasure("");
      setStock(0);
      setDefaultSupplierId(null);
    } catch (error: any) {
      console.error("Error creating raw material:", error);
      toast.error(error.message || "An unknown error occurred during raw material creation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Raw Material</DialogTitle>
          <DialogDescription>
            Enter the details for the new raw material.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="name" className="text-left">
              Material Name
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
            <Label htmlFor="category" className="text-left">
              Category/Type
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="unitOfMeasure" className="text-left">
              Unit of Measure
            </Label>
            <Input
              id="unitOfMeasure"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="stock" className="text-left">
              Current Stock Quantity
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
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="defaultSupplier" className="text-left">
              Default Supplier
            </Label>
            <Select onValueChange={(value) => setDefaultSupplierId(value === "none-selected" ? null : value)} value={defaultSupplierId || "none-selected"}>
              <SelectTrigger className="w-[180px] col-span-2">
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none-selected">None</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.supplier_shop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Raw Material"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
