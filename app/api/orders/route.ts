import { NextResponse } from "next/server";

// Simple in-memory orders storage (for demo purposes)
let orders: any[] = [];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    let filteredOrders = [...orders];

    // Filter by status
    if (statusFilter && statusFilter !== "all") {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === statusFilter
      );
    }

    // Sort orders
    filteredOrders.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (valA < valB) {
        return sortOrder === "asc" ? -1 : 1;
      } else if (valA > valB) {
        return sortOrder === "asc" ? 1 : -1;
      }
      return 0;
    });

    return NextResponse.json(filteredOrders);
  } catch (error: unknown) {
    console.error("Unexpected error in orders API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const orderData = await req.json();

    const newOrder = {
      id: `order-${Date.now()}`,
      userId: "demo-user-123",
      orderNumber: `ORD-${Date.now()}`,
      status: "Pending",
      totalAmount: orderData.totalAmount || 0,
      paymentMethod: orderData.paymentMethod || "Cash on Delivery",
      deliveryMethod: orderData.deliveryMethod || "Standard Delivery",
      deliveryStatus: "Pending",
      notes: orderData.notes || "",
      items: orderData.items || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orders.push(newOrder);

    return NextResponse.json(newOrder);
  } catch (error: unknown) {
    console.error("Unexpected error in create order API:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
