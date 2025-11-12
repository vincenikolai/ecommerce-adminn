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
  const [type, setType] = useState("Raw Material"); // New state for classification
  const [unitOfMeasure, setUnitOfMeasure] = useState("g"); // Default to grams
  const [unitValue, setUnitValue] = useState<string>(""); // New state for the numerical value
  const [stock, setStock] = useState<string>("");
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

  // Auto-select ELA Chemicals for Finished Products
  useEffect(() => {
    if (type === "Finished Product" && suppliers.length > 0) {
      const elaChemicals = suppliers.find(
        (supplier) => supplier.company_name === "ELA Chemicals" || supplier.supplier_shop === "ELA Chemicals"
      );
      if (elaChemicals) {
        setDefaultSupplierId(elaChemicals.id);
      }
    }
  }, [type, suppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Combine unitValue and unitOfMeasure for the payload
    const parsedUnitValue = parseInt(unitValue, 10) || 1;
    const combinedUnitOfMeasure = `${parsedUnitValue}${unitOfMeasure}`;
    const parsedStock = parseInt(stock, 10) || 0;

    try {
      const response = await fetch("/api/admin/raw-materials/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, category, type, unitOfMeasure: combinedUnitOfMeasure, stock: parsedStock, defaultSupplierId }),
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
      setType("Raw Material"); // Reset to default
      setUnitOfMeasure("g"); // Reset to default
      setUnitValue(""); // Reset to default
      setStock("");
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
            <Label htmlFor="materialType" className="text-left">
              Material Type
            </Label>
            <Select onValueChange={(value) => setType(value)} value={type} required>
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Finished Product">Finished Product</SelectItem>
                <SelectItem value="Raw Material">Raw Material</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="unitOfMeasure" className="text-left">
              Unit of Measure
            </Label>
            <div className="col-span-2 flex items-center gap-2">
              <Input
                id="unitValue"
                type="number"
                min="1"
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                required
                className="w-24"
              />
              <Select onValueChange={(value) => setUnitOfMeasure(value)} value={unitOfMeasure} required>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="stock" className="text-left">
              Current Stock Quantity
            </Label>
            <Input
              id="stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="defaultSupplier" className="text-left">
              Default Supplier
            </Label>
            <div className="col-span-2">
              <Select 
                onValueChange={(value) => setDefaultSupplierId(value === "none-selected" ? null : value)} 
                value={defaultSupplierId || "none-selected"}
                disabled={type === "Finished Product"}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none-selected">None</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.company_name || supplier.supplier_shop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {type === "Finished Product" && (
                <p className="text-sm text-blue-600 mt-1">
                  ℹ️ Auto-set to ELA Chemicals for Finished Products
                </p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Raw Material"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
