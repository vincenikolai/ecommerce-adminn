import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

import prismadb from "@/lib/prismadb";

export async function GET(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId") || undefined;
    const status = searchParams.get("status") || undefined;

    const purchaseInvoices = await prismadb.purchaseInvoice.findMany({
      where: {
        supplierId,
        status,
      },
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

    return NextResponse.json(purchaseInvoices);
  } catch (error) {
    console.log("[PURCHASE_INVOICES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

