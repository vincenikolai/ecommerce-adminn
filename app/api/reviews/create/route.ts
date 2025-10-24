import { NextResponse } from "next/server";

// Simple in-memory reviews storage (for demo purposes)
let reviews: any[] = [];

export async function POST(req: Request) {
  try {
    const { userName, userEmail, rating, title, content } = await req.json();

    if (!rating || !title || !content) {
      return NextResponse.json(
        {
          error: "Rating, title, and content are required",
        },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          error: "Rating must be between 1 and 5",
        },
        { status: 400 }
      );
    }

    // Create review (anonymous reviews allowed)
    const review = {
      id: `review-${Date.now()}`,
      userId: "anonymous",
      userName: userName?.trim() || "Anonymous",
      userEmail: userEmail || "anonymous@example.com",
      rating: parseInt(rating),
      title: title.trim(),
      content: content.trim(),
      isApproved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    reviews.push(review);

    return NextResponse.json(
      {
        message:
          "Review submitted successfully. It will be reviewed before being published.",
        review,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      {
        error: "Failed to create review",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Return only approved reviews
    const approvedReviews = reviews.filter((review) => review.isApproved);

    return NextResponse.json(approvedReviews);
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
