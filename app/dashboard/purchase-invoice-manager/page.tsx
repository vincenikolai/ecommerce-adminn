import { format } from "date-fns";

import prismadb from "@/lib/prismadb";
import { PurchaseInvoiceClient } from "./components/client";
import { PurchaseInvoiceColumn } from "./components/columns";
import { priceFormatter } from "@/lib/utils";

const PurchaseInvoicesPage = async () => {
  const purchaseInvoices = await prismadb.purchaseInvoice.findMany({
    include: {
      supplier: true,
      purchaseOrder: true,
      receivingReport: true,
      materials: {
        include: {
          rawMaterial: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedPurchaseInvoices: PurchaseInvoiceColumn[] = purchaseInvoices.map(
    (item) => ({
      id: item.id,
      invoiceNumber: item.invoiceNumber,
      supplierName: item.supplier?.name || "N/A",
      poReference: item.purchaseOrder?.poReferenceNumber || "N/A",
      receivingReportNumber: item.receivingReport?.receivingReportNumber || "N/A",
      invoiceDate: format(item.invoiceDate, "MMMM do, yyyy"),
      dueDate: format(item.dueDate, "MMMM do, yyyy"),
      paymentTerms: item.paymentTerms || "N/A",
      status: item.status,
      totalAmount: priceFormatter.format(
        item.materials.reduce((total, material) => {
          return total + material.quantity * material.unitPrice;
        }, 0)
      ),
      createdAt: format(item.createdAt, "MMMM do, yyyy"),
    })
  );

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PurchaseInvoiceClient data={formattedPurchaseInvoices} />
      </div>
    </div>
  );
};

export default PurchaseInvoicesPage;

