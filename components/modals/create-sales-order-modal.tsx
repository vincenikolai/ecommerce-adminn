"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface CreateSalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quotationId: string, materialIds: string[]) => Promise<void>;
  quotationsToConvert: { id: string; supplier?: { company_name: string; supplier_shop?: string }; materials: { id: string; rawMaterialId: string; quantity: number }[] }[]; // Changed to rawMaterialId
  selectedMaterials: Map<string, Set<string>>;
  getRawMaterialName: (id: string) => string;
}

export const CreateSalesOrderModal: React.FC<CreateSalesOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  quotationsToConvert, // Changed from quotationToConvert
  selectedMaterials,
  getRawMaterialName,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (quotationsToConvert.length === 0) return; // Check length instead of null

    setIsLoading(true);
    try {
      for (const quotation of quotationsToConvert) {
        const materialsToConvert = selectedMaterials.get(quotation.id);
        if (!materialsToConvert || materialsToConvert.size === 0) {
          toast.error(`Please select at least one material for quotation ${quotation.id}`);
          setIsLoading(false);
          return; // Stop if any quotation has no selected materials
        }
        await onConfirm(quotation.id, Array.from(materialsToConvert));
      }
      onClose();
    } catch (error) {
      // toast.error is already handled in onConfirm's parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Sales Order</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>
            Are you sure you want to convert the selected materials to Sales
            Orders?
          </p>
          {quotationsToConvert.length > 0 && (
            <div className="mt-4">
              <h3 className="text-md font-semibold">Quotations to Convert:</h3>
              {quotationsToConvert.map((quotation) => {
                const materialsForThisQuotation = selectedMaterials.get(quotation.id);
                const allMaterials = quotation.materials || [];
                return ( 
                  <div key={quotation.id} className="mb-4 p-2 border rounded-md bg-gray-50">
                    <p className="font-medium">
                      Quotation ID: {quotation.id} {(quotation.supplier?.company_name || quotation.supplier?.supplier_shop) ? `(Supplier: ${quotation.supplier.company_name || quotation.supplier.supplier_shop})` : ""}
                    </p>
                    {materialsForThisQuotation && materialsForThisQuotation.size > 0 ? (
                      <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                        {Array.from(materialsForThisQuotation).map((materialId) => {
                          const material = allMaterials.find(m => m.id === materialId);
                          return (
                            <li key={materialId}>
                              {material ? `${getRawMaterialName(material.rawMaterialId)} x ${material.quantity}` : 'Unknown material'}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No materials selected for this quotation.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-sm text-gray-600 mt-2">
            This will create new Sales Orders for each selected quotation and
            remove them from the Sales Quotation list.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Converting..." : "Yes, Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
