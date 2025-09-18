"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash } from "lucide-react";
import { PurchaseInvoice, PurchaseInvoiceMaterial, RawMaterial, ReceivingReport, PurchaseOrder, Supplier } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  invoiceNumber: z.string().min(1),
  supplierId: z.string().min(1),
  poReference: z.string().optional(),
  receivingReportId: z.string().optional(),
  invoiceDate: z.date(),
  dueDate: z.date(),
  paymentTerms: z.string().optional(),
  status: z.enum(["Unpaid", "Partially Paid", "Paid"]),
  materials: z.array(
    z.object({
      rawMaterialId: z.string().min(1),
      quantity: z.coerce.number().min(1),
      unitPrice: z.coerce.number().min(0),
    })
  ),
});

type PurchaseInvoiceFormValues = z.infer<typeof formSchema>;

interface PurchaseInvoiceFormProps {
  initialData: (PurchaseInvoice & { materials: (PurchaseInvoiceMaterial & { rawMaterial: RawMaterial })[] }) | null;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  receivingReports: ReceivingReport[];
  rawMaterials: RawMaterial[];
}

export const PurchaseInvoiceForm: React.FC<PurchaseInvoiceFormProps> = ({
  initialData,
  suppliers,
  purchaseOrders,
  receivingReports,
  rawMaterials,
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit purchase invoice" : "Create purchase invoice";
  const description = initialData ? "Edit a purchase invoice." : "Add a new purchase invoice";
  const toastMessage = initialData ? "Purchase invoice updated." : "Purchase invoice created.";
  const action = initialData ? "Save changes" : "Create";

  const form = useForm<PurchaseInvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          invoiceDate: new Date(initialData.invoiceDate),
          dueDate: new Date(initialData.dueDate),
          materials: initialData.materials.map((material) => ({
            rawMaterialId: material.rawMaterialId,
            quantity: material.quantity,
            unitPrice: material.unitPrice,
          })),
        }
      : {
          invoiceNumber: "",
          supplierId: "",
          poReference: "",
          receivingReportId: "",
          invoiceDate: new Date(),
          dueDate: new Date(),
          paymentTerms: "",
          status: "Unpaid",
          materials: [],
        },
  });

  const onSubmit = async (data: PurchaseInvoiceFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(
          `/api/admin/purchase-invoices/${params.purchaseInvoiceId}`,
          data
        );
      } else {
        await axios.post(`/api/admin/purchase-invoices/create`, data);
      }
      router.refresh();
      router.push(`/dashboard/purchase-invoice-manager`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(
        `/api/admin/purchase-invoices/${params.purchaseInvoiceId}`
      );
      router.refresh();
      router.push(`/dashboard/purchase-invoice-manager`);
      toast.success("Purchase invoice deleted.");
    } catch (error: any) {
      toast.error(
        "Make sure you removed all related products and categories first."
      );
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 w-full"
        >
          <div className="md:grid md:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Invoice number"
                      {...field}
                    />
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
                  <Select
                    disabled={loading}
                    onOpenChange={() => {}}
                    value={field.value}
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select a supplier"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="poReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PO Reference</FormLabel>
                  <Select
                    disabled={loading}
                    onOpenChange={() => {}}
                    value={field.value}
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select a purchase order"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {purchaseOrders.map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.poReferenceNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receivingReportId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receiving Report</FormLabel>
                  <Select
                    disabled={loading}
                    onOpenChange={() => {}}
                    value={field.value}
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select a receiving report"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {receivingReports.map((rr) => (
                        <SelectItem key={rr.id} value={rr.id}>
                          {rr.receivingReportNumber}
                        </SelectItem>
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
                <FormItem className="flex flex-col">
                  <FormLabel>Invoice Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                    <Input
                      disabled={loading}
                      placeholder="e.g., Net 30, COD"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    disabled={loading}
                    onOpenChange={() => {}}
                    value={field.value}
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select status"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <h3 className="text-lg font-medium">Materials</h3>
          <Separator />
          {form.watch("materials").map((material, index) => (
            <div key={index} className="md:grid md:grid-cols-4 gap-4 items-end">
              <FormField
                control={form.control}
                name={`materials.${index}.rawMaterialId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Raw Material</FormLabel>
                    <Select
                      disabled={loading}
                      onOpenChange={() => {}}
                      value={field.value}
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            defaultValue={field.value}
                            placeholder="Select a raw material"
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rawMaterials.map((rm) => (
                          <SelectItem key={rm.id} value={rm.id}>
                            {rm.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`materials.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={loading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`materials.${index}.unitPrice`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price</FormLabel>
                    <FormControl>
                      <Input type="number" disabled={loading} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  const currentMaterials = form.getValues("materials");
                  const newMaterials = currentMaterials.filter(
                    (_, i) => i !== index
                  );
                  form.setValue("materials", newMaterials);
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() =>
              form.setValue("materials", [
                ...form.getValues("materials"),
                { rawMaterialId: "", quantity: 1, unitPrice: 0 },
              ])
            }
            className="mb-4"
          >
            Add Material
          </Button>
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};

