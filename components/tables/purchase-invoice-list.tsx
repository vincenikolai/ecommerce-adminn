'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PurchaseInvoice } from '@/types/purchase-invoice';
import { DataTable } from '@/components/ui/data-table';
import { AlertModal } from '@/components/modals/alert-modal';

interface PurchaseInvoiceListProps {
  data: PurchaseInvoice[];
  onRefresh: () => void;
}

export const PurchaseInvoiceList: React.FC<PurchaseInvoiceListProps> = ({ data, onRefresh }) => {
  const router = useRouter();
  const params = useParams();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const onConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    try {
      setLoading(true);
      await axios.delete(`/api/admin/purchase-invoices/delete`, { data: { id: invoiceToDelete } });
      toast.success("Purchase invoice deleted.");
      onRefresh();
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
      setOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const columns: ColumnDef<PurchaseInvoice>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice Number",
    },
    {
      accessorKey: "supplier.name",
      header: "Supplier",
      cell: ({ row }) => row.original.supplier?.name || 'N/A',
    },
    {
      accessorKey: "poReferenceNumber",
      header: "PO Reference",
    },
    {
      accessorKey: "receivingReportReferenceNumber",
      header: "RR Reference",
    },
    {
      accessorKey: "invoiceDate",
      header: "Invoice Date",
      cell: ({ row }) => format(new Date(row.original.invoiceDate), 'PPP'),
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => format(new Date(row.original.dueDate), 'PPP'),
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment Status",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              ...
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/purchase-invoice-manager/${row.original.id}`)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setOpen(true); setInvoiceToDelete(row.original.id); }}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirmDelete}
        loading={loading}
      />
      <DataTable searchKey="invoiceNumber" columns={columns} data={data} />
    </>
  );
};
