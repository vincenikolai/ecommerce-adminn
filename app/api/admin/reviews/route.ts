import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ADMIN_EMAIL = "eastlachemicals@gmail.com";

export async function GET(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const {
      data: { session },
      error: sessionError,
    } = await authClient.auth.getSession();

    if (sessionError || !session || session.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const reviews = await prisma.review.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(reviews, { status: 200 });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch reviews",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const authClient = createRouteHandlerClient({ cookies });
    const {
      data: { session },
      error: sessionError,
    } = await authClient.auth.getSession();

    if (sessionError || !session || session.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { reviewId, isApproved } = await req.json();

    if (!reviewId || typeof isApproved !== "boolean") {
      return NextResponse.json(
        {
          error: "Review ID and approval status are required",
        },
        { status: 400 }
      );
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { isApproved },
    });

    return NextResponse.json(
      {
        message: `Review ${isApproved ? "approved" : "rejected"} successfully`,
        review,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      {
        error: "Failed to update review",
      },
      { status: 500 }
    );
  }
}
