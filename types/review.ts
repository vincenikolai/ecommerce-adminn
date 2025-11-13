export interface Review {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1-5 stars
  title: string;
  content: string;
  isApproved: boolean;
  productId?: string | null;
  orderId?: string | null;
  createdAt: string;
  updatedAt: string;
  // Eager loaded relations
  comments?: ReviewComment[];
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface ReviewComment {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userEmail: string;
  content: string;
  parentCommentId: string | null; // For nested replies
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  // Eager loaded relations
  replies?: ReviewComment[];
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface CreateReviewRequest {
  rating: number;
  title: string;
  content: string;
  productId?: string;
  orderId?: string;
}

export interface CreateReviewCommentRequest {
  reviewId: string;
  content: string;
  parentCommentId?: string | null;
}

