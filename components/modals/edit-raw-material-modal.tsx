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

interface EditRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawMaterial: RawMaterial;
  onRawMaterialUpdated: (updatedRawMaterial: RawMaterial) => void;
}

export const EditRawMaterialModal: React.FC<EditRawMaterialModalProps> = ({ isOpen, onClose, rawMaterial, onRawMaterialUpdated }) => {
  const [name, setName] = useState(rawMaterial.name);
  const [category, setCategory] = useState(rawMaterial.category || "");
  const [materialType, setMaterialType] = useState(rawMaterial.materialType || "Raw Material");
  const [unitOfMeasure, setUnitOfMeasure] = useState(rawMaterial.unitOfMeasure || "");
  const [stock, setStock] = useState<string>(rawMaterial.stock?.toString() || "");
  const [defaultSupplierId, setDefaultSupplierId] = useState<string | null>(rawMaterial.defaultSupplierId || null);
  const [suppliers, setSuppliers] = useState<SupplierManagementItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (rawMaterial) {
      setName(rawMaterial.name);
      setCategory(rawMaterial.category || "");
      setMaterialType(rawMaterial.materialType || "Raw Material");
      setUnitOfMeasure(rawMaterial.unitOfMeasure || "");
      setStock(rawMaterial.stock?.toString() || "");
      setDefaultSupplierId(rawMaterial.defaultSupplierId || null);
    }
  }, [rawMaterial]);

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
    if (materialType === "Finished Product" && suppliers.length > 0) {
      const elaChemicals = suppliers.find(
        (supplier) => supplier.company_name === "ELA Chemicals" || supplier.supplier_shop === "ELA Chemicals"
      );
      if (elaChemicals) {
        setDefaultSupplierId(elaChemicals.id);
      }
    }
  }, [materialType, suppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const parsedStock = parseInt(stock, 10) || 0;

    // Debug logging
    console.log("DEBUG - Edit Raw Material Submit:", {
      id: rawMaterial.id,
      name,
      category,
      materialType,
      unitOfMeasure,
      stock: parsedStock,
      defaultSupplierId,
      defaultSupplierIdType: typeof defaultSupplierId
    });

    try {
      const response = await fetch("/api/admin/raw-materials/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: rawMaterial.id, name, category, materialType, unitOfMeasure, stock: parsedStock, defaultSupplierId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update raw material");
      }

      const responseData = await response.json();
      toast.success("Raw material updated successfully!");
      onRawMaterialUpdated(responseData.rawMaterial);
      onClose();
    } catch (error: any) {
      console.error("Error updating raw material:", error);
      toast.error(error.message || "An unknown error occurred during raw material update.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Raw Material: {rawMaterial.name}</DialogTitle>
          <DialogDescription>
            Update the details for the raw material.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editName" className="text-left">
              Material Name
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
            <Label htmlFor="editCategory" className="text-left">
              Category/Type
            </Label>
            <Input
              id="editCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editMaterialType" className="text-left">
              Material Type
            </Label>
            <Select onValueChange={(value) => setMaterialType(value)} value={materialType} required>
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
            <Label htmlFor="editUnitOfMeasure" className="text-left">
              Unit of Measure
            </Label>
            <Input
              id="editUnitOfMeasure"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editStock" className="text-left">
              Current Stock Quantity
            </Label>
            <Input
              id="editStock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
              className="col-span-2"
            />
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="editDefaultSupplier" className="text-left">
              Default Supplier
            </Label>
            <div className="col-span-2">
              <Select 
                onValueChange={(value) => setDefaultSupplierId(value === "none-selected" ? null : value)} 
                value={defaultSupplierId || "none-selected"}
                disabled={materialType === "Finished Product"}
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
              {materialType === "Finished Product" && (
                <p className="text-sm text-blue-600 mt-1">
                  ℹ️ Auto-set to ELA Chemicals for Finished Products
                </p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Raw Material"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
