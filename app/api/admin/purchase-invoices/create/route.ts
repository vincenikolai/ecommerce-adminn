import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const {
      invoiceNumber,
      supplierId,
      poReference,
      receivingReportId,
      invoiceDate,
      dueDate,
      paymentTerms,
      status,
      materials,
    } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!invoiceNumber) {
      return new NextResponse("Invoice number is required", { status: 400 });
    }

    if (!supplierId) {
      return new NextResponse("Supplier ID is required", { status: 400 });
    }

    if (!invoiceDate) {
      return new NextResponse("Invoice date is required", { status: 400 });
    }

    if (!dueDate) {
      return new NextResponse("Due date is required", { status: 400 });
    }

    const purchaseInvoice = await prismadb.purchaseInvoice.create({
      data: {
        invoiceNumber,
        supplierId,
        poReference,
        receivingReportId,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        paymentTerms,
        status,
        materials: {
          createMany: {
            data: [...materials.map((material: any) => ({ ...material }))],
          },
        },
      },
    });

    return NextResponse.json(purchaseInvoice);
  } catch (error) {
    console.log("[PURCHASE_INVOICES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

