'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Heading } from '@/components/ui/heading';
import { PurchaseInvoice, PaymentStatus } from '@/types/purchase-invoice';
import { Supplier } from '@/types/supplier-management';
import { PurchaseOrder } from '@/types/purchase-order';
import { ReceivingReport } from '@/types/receiving-report';
import { RawMaterial } from '@/types/raw-material';

interface PurchaseInvoiceFormProps {
  initialData?: PurchaseInvoice | null;
  purchaseOrders: PurchaseOrder[]; // Add purchaseOrders prop
  rawMaterials: RawMaterial[];     // Add rawMaterials prop
  receivingReports: ReceivingReport[]; // Add receivingReports prop
  onClose: () => void;
  onSuccess: () => void;
}

const formSchema = z.object({
  invoiceNumber: z.string().min(1, { message: "Invoice number is required." }),
  supplierId: z.string().min(1, { message: "Supplier is required." }),
  poReferenceNumber: z.string().min(1, { message: "Purchase Order reference is required." }),
  receivingReportReferenceNumber: z.string().min(1, { message: "Receiving Report reference is required." }),
  invoiceDate: z.string().min(1, { message: "Invoice date is required." }),
  dueDate: z.string().min(1, { message: "Due date is required." }),
  materials: z.array(z.object({ rawMaterialId: z.string(), quantity: z.number() })).optional(), // Adjust as needed for specific material input
  paymentTerms: z.string().optional(),
  paymentStatus: z.nativeEnum(PaymentStatus, { required_error: "Payment status is required." }),
});

type PurchaseInvoiceFormValues = z.infer<typeof formSchema>;

export const PurchaseInvoiceForm: React.FC<PurchaseInvoiceFormProps> = ({
  initialData,
  purchaseOrders, // Destructure purchaseOrders prop
  rawMaterials,   // Destructure rawMaterials prop
  receivingReports, // Destructure receivingReports prop
}) => {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  // const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]); // Remove internal state
  // const [receivingReports, setReceivingReports] = useState<ReceivingReport[]>([]); // Remove internal state
  const [selectedMaterialsForInvoice, setSelectedMaterialsForInvoice] = useState<{ rawMaterialId: string; quantity: number }[]>([]);

  // Helper to get raw material name by ID
  const getRawMaterialName = (id: string) => {
    return rawMaterials.find(rm => rm.id === id)?.name || 'Unknown Raw Material';
  };

  // Handlers for materials
  const handleAddMaterialToInvoice = (rawMaterialId: string, quantity: number = 1) => {
    setSelectedMaterialsForInvoice(prev => {
      const existing = prev.find(m => m.rawMaterialId === rawMaterialId);
      if (existing) {
        return prev.map(m => m.rawMaterialId === rawMaterialId ? { ...m, quantity: m.quantity + quantity } : m);
      } else {
        return [...prev, { rawMaterialId, quantity }];
      }
    });
  };

  const handleUpdateInvoiceMaterialQuantity = (rawMaterialId: string, quantity: number) => {
    setSelectedMaterialsForInvoice(prev =>
      prev.map(m => m.rawMaterialId === rawMaterialId ? { ...m, quantity: quantity } : m)
    );
  };

  const handleRemoveInvoiceMaterial = (rawMaterialId: string) => {
    setSelectedMaterialsForInvoice(prev => prev.filter(m => m.rawMaterialId !== rawMaterialId));
  };

  const title = initialData ? "Edit purchase invoice" : "Create purchase invoice";
  const description = initialData ? "Edit an existing purchase invoice." : "Add a new purchase invoice.";
  const toastMessage = initialData ? "Purchase invoice updated." : "Purchase invoice created.";
  const action = initialData ? "Save changes" : "Create";

  const form = useForm<PurchaseInvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? { 
          ...initialData,
          invoiceDate: initialData.invoiceDate ? new Date(initialData.invoiceDate).toISOString().split('T')[0] : "",
          dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : "",
          paymentStatus: initialData.paymentStatus as PaymentStatus,
        }
      : {
          invoiceNumber: "",
          supplierId: "",
          poReferenceNumber: "",
          receivingReportReferenceNumber: "",
          invoiceDate: "",
          dueDate: "",
          materials: [], // Default to an empty array for structured materials
          paymentTerms: "",
          paymentStatus: PaymentStatus.Unpaid, // Default to Unpaid
        },
  });

  useEffect(() => {
    if (initialData?.materials) {
      try {
        // Assuming initialData.materials is an array of { rawMaterialId: string; quantity: number }
        setSelectedMaterialsForInvoice(initialData.materials as { rawMaterialId: string; quantity: number }[]);
      } catch (error) {
        console.error("Error parsing initial materials data:", error);
        toast.error("Error loading initial materials data.");
      }
    }
  }, [initialData]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const suppliersRes = await axios.get('/api/admin/supplier-management/list');
        setSuppliers(suppliersRes.data);
      } catch (error) {
        toast.error("Failed to fetch suppliers.");
        console.error("Error fetching suppliers:", error);
      }
    };
    fetchSuppliers();
  }, []); // Only fetch suppliers, as other data is passed via props

  const onSubmit = async (data: PurchaseInvoiceFormValues) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        materials: selectedMaterialsForInvoice, // Use the structured materials
      };
      if (initialData) {
        await axios.patch(`/api/admin/purchase-invoices/update`, { id: initialData.id, ...payload });
      } else {
        await axios.post(`/api/admin/purchase-invoices/create`, payload);
      }
      router.refresh();
      router.push(`/dashboard/purchase-invoice-manager`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error("Something went wrong.");
      console.error("Form submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/admin/purchase-invoices/delete`, { data: { id: initialData?.id } });
      router.refresh();
      router.push(`/dashboard/purchase-invoice-manager`);
      toast.success("Purchase invoice deleted.");
    } catch (error: any) {
      toast.error("Something went wrong.");
      console.error("Delete error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Invoice Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="poReferenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PO Reference Number</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a Purchase Order" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {purchaseOrders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>{po.ponumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receivingReportReferenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receiving Report Reference</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a Receiving Report" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {receivingReports.map((rr) => (
                        <SelectItem key={rr.id} value={rr.id}>{rr.id} (Date: {new Date(rr.receiveddate).toLocaleDateString()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Date</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={loading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Materials field - for simplicity, a basic input for JSON string or future custom component */}
            <div className="col-span-3">
              <FormLabel>Materials</FormLabel>
              <div className="flex items-center space-x-2 mb-2">
                <Select onValueChange={(value) => handleAddMaterialToInvoice(value)} value="">
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Add Raw Material" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawMaterials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} ({material.unitOfMeasure})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedMaterialsForInvoice.length === 0 ? (
                <p className="text-sm text-gray-500">No materials added to this invoice.</p>
              ) : (
                <ul className="space-y-2 mt-2">
                  {selectedMaterialsForInvoice.map((material, index) => (
                    <li key={material.rawMaterialId || index} className="flex items-center space-x-2">
                      <span>{getRawMaterialName(material.rawMaterialId)}</span>
                      <Input
                        type="number"
                        min="1"
                        value={material.quantity}
                        onChange={(e) => handleUpdateInvoiceMaterialQuantity(material.rawMaterialId, parseInt(e.target.value, 10))}
                        className="w-20"
                      />
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveInvoiceMaterial(material.rawMaterialId)}>
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* End Materials field */}
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="e.g., 30 days" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select payment status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(PaymentStatus).map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
