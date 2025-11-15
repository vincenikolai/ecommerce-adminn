import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import { Product } from '@/types/product';
import { RawMaterial } from '@/types/raw-material';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (newProduct: Product) => void;
}

interface BOMItem {
  rawMaterialId: string;
  quantityPerUnit: number;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({ 
  isOpen, 
  onClose, 
  onProductCreated 
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("0");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [bom, setBom] = useState<BOMItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchRawMaterials = async () => {
        try {
          const response = await fetch("/api/admin/raw-materials/list");
          if (!response.ok) {
            throw new Error("Failed to fetch raw materials");
          }
          const data: RawMaterial[] = await response.json();
          setRawMaterials(data.filter(rm => rm.materialType === 'Raw Material'));
        } catch (error) {
          console.error("Error fetching raw materials:", error);
        }
      };
      fetchRawMaterials();
    }
  }, [isOpen]);

  const handleAddBOMItem = () => {
    setBom([...bom, { rawMaterialId: "", quantityPerUnit: 0 }]);
  };

  const handleRemoveBOMItem = (index: number) => {
    setBom(bom.filter((_, i) => i !== index));
  };

  const handleBOMChange = (index: number, field: keyof BOMItem, value: string | number) => {
    const updatedBOM = [...bom];
    updatedBOM[index] = { ...updatedBOM[index], [field]: value };
    setBom(updatedBOM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock, 10) || 0;

    if (!name || !parsedPrice || parsedStock === undefined) {
      toast.error("Name, price, and stock are required.");
      setIsLoading(false);
      return;
    }

    if (parsedPrice <= 0) {
      toast.error("Price must be greater than 0.");
      setIsLoading(false);
      return;
    }

    // Validate URL format if provided (but allow empty)
    if (imageUrl && imageUrl.trim() !== "") {
      try {
        new URL(imageUrl);
      } catch {
        toast.error("Please enter a valid URL or leave the field empty.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const bomPayload = bom.filter(item => item.rawMaterialId && item.quantityPerUnit > 0);
      
      const response = await fetch("/api/admin/products/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name, 
          description: description || undefined,
          price: parsedPrice,
          stock: parsedStock,
          category: category || undefined,
          imageUrl: imageUrl || undefined,
          isActive,
          bom: bomPayload.length > 0 ? bomPayload : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create product");
      }

      const responseData = await response.json();
      toast.success("Product created successfully!");
      onProductCreated(responseData.product);
      onClose();
      // Clear form
      setName("");
      setDescription("");
      setPrice("");
      setStock("0");
      setCategory("");
      setImageUrl("");
      setIsActive(true);
      setBom([]);
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your catalog. Fill in the required information below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Chemicals, Equipment"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (PHP) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="imageUrl">Image URL (Optional)</Label>
            <Input
              id="imageUrl"
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Product is active (visible to customers)
            </Label>
          </div>

          {/* Bill of Materials Section */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <Label>Bill of Materials (BOM) - Optional</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBOMItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Material
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Define raw materials needed to produce this product
            </p>
            {bom.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No materials added</p>
            ) : (
              <div className="space-y-2">
                {bom.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Raw Material</Label>
                      <Select
                        value={item.rawMaterialId}
                        onValueChange={(value) => handleBOMChange(index, "rawMaterialId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {rawMaterials.map((rm) => (
                            <SelectItem key={rm.id} value={rm.id}>
                              {rm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label>Quantity per Unit</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantityPerUnit}
                        onChange={(e) => handleBOMChange(index, "quantityPerUnit", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBOMItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

