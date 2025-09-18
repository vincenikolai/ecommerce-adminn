"use client";

import { Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";

import { PurchaseInvoiceColumn, columns } from "./columns";

interface PurchaseInvoiceClientProps {
  data: PurchaseInvoiceColumn[];
}

export const PurchaseInvoiceClient: React.FC<PurchaseInvoiceClientProps> = ({
  data
}) => {
  const router = useRouter();
  const params = useParams();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Purchase Invoices (${data.length})`}
          description="Manage purchase invoices for your business"
        />
        <Button onClick={() => router.push(`/dashboard/purchase-invoice-manager/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="invoiceNumber" columns={columns} data={data} />
    </>
  );
};
