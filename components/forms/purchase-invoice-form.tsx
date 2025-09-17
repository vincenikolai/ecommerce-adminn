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

interface PurchaseInvoiceFormProps {
  initialData?: PurchaseInvoice | null;
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
  materials: z.any().optional(), // Adjust as needed for specific material input
  paymentTerms: z.string().optional(),
  paymentStatus: z.nativeEnum(PaymentStatus, { required_error: "Payment status is required." }),
});

type PurchaseInvoiceFormValues = z.infer<typeof formSchema>;

export const PurchaseInvoiceForm: React.FC<PurchaseInvoiceFormProps> = ({ initialData }) => {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receivingReports, setReceivingReports] = useState<ReceivingReport[]>([]);

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
          materials: undefined,
          paymentTerms: "",
          paymentStatus: PaymentStatus.Unpaid, // Default to Unpaid
        },
  });

  // Fetch suppliers, purchase orders, and receiving reports
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersRes, poRes, rrRes] = await Promise.all([
          axios.get('/api/admin/supplier-management/list'),
          axios.get('/api/admin/purchase-orders/list'),
          axios.get('/api/admin/receiving-reports/list'),
        ]);
        setSuppliers(suppliersRes.data);
        setPurchaseOrders(poRes.data);
        setReceivingReports(rrRes.data);
      } catch (error) {
        toast.error("Failed to fetch related data.");
        console.error("Error fetching related data:", error);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data: PurchaseInvoiceFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/admin/purchase-invoices/update`, { id: initialData.id, ...data });
      } else {
        await axios.post(`/api/admin/purchase-invoices/create`, data);
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
                        <SelectItem key={po.id} value={po.id}>{po.poReferenceNumber}</SelectItem>
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
                        <SelectItem key={rr.id} value={rr.id}>{rr.receivingReportNumber}</SelectItem>
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
            <FormField
              control={form.control}
              name="materials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Materials (JSON)</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Optional JSON string for materials" {...field} value={field.value ? JSON.stringify(field.value) : ''} onChange={(e) => {
                      try {
                        field.onChange(e.target.value ? JSON.parse(e.target.value) : undefined);
                      } catch (error) {
                        toast.error("Invalid JSON for materials.");
                      }
                    }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
