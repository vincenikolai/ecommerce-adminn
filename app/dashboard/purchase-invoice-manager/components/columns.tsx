import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

export type PurchaseInvoiceColumn = {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  poReference: string;
  receivingReportNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  status: string;
  totalAmount: string;
  createdAt: string;
};

export const columns: ColumnDef<PurchaseInvoiceColumn>[] = [
  {
    id: "select",
    header: ({
      table
    }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({
      row
    }) => (
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
    accessorKey: "supplierName",
    header: "Supplier",
  },
  {
    accessorKey: "poReference",
    header: "PO Reference",
  },
  {
    accessorKey: "receivingReportNumber",
    header: "Receiving Report",
  },
  {
    accessorKey: "invoiceDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Invoice Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
  },
  {
    accessorKey: "paymentTerms",
    header: "Payment Terms",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const purchaseInvoice = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(purchaseInvoice.id)
              }
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuItem
            // onClick={() => router.push(`/dashboard/purchase-invoice-manager/${purchaseInvoice.id}`)}
            >
              Update
            </DropdownMenuItem>
            <DropdownMenuItem
            // onClick={() => setOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

