import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";

export async function DELETE(
  req: Request,
  { params }: { params: { purchaseInvoiceId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.purchaseInvoiceId) {
      return new NextResponse("Purchase Invoice ID is required", { status: 400 });
    }

    const purchaseInvoice = await prismadb.purchaseInvoice.delete({
      where: {
        id: params.purchaseInvoiceId,
      },
    });

    return NextResponse.json(purchaseInvoice);
  } catch (error) {
    console.log("[PURCHASE_INVOICES_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

