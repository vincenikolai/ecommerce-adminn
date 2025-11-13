"use client";

import { useEffect, useState } from "react";
import {
  createClientComponentClient,
  Session,
} from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  User,
  Calendar,
  MessageSquare,
  Edit,
  Trash2,
  Send,
  Reply,
} from "lucide-react";
import toast from "react-hot-toast";
import { UserProfile } from "@/types/user";
import { Review, ReviewComment } from "@/types/review";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LayoutType = "List" | "Masonry" | "Carousel";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: "",
    content: "",
  });
  
  // Layout and display options
  const [layout, setLayout] = useState<LayoutType>("Masonry");
  const [verticalSpacing, setVerticalSpacing] = useState(20);
  const [horizontalSpacing, setHorizontalSpacing] = useState(20);
  const [reviewsPerPage, setReviewsPerPage] = useState(6);
  
  // Comments state
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentForms, setCommentForms] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});

  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
      } else {
        setSession(session);
        if (session) {
          await fetchUserProfile(session.user.id);
        }
      }
      setIsLoading(false);
    };

    getSession();
    fetchReviews();
  }, [supabase.auth]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews/list?approved=true");
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      } else {
        toast.error("Failed to fetch reviews");
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to fetch reviews");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error("Please log in to submit a review");
      return;
    }

    if (!userProfile || userProfile.role !== "customer") {
      toast.error("Only customers can submit reviews");
      return;
    }

    if (!reviewForm.rating || !reviewForm.title || !reviewForm.content) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reviews/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: reviewForm.rating,
          title: reviewForm.title,
          content: reviewForm.content,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setReviewForm({ rating: 0, title: "", content: "" });
        setShowReviewForm(false);
        fetchReviews();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComment = async (reviewId: string, parentCommentId?: string) => {
    const commentContent = commentForms[reviewId]?.trim();
    if (!commentContent) {
      toast.error("Please enter a comment");
      return;
    }

    if (!session) {
      toast.error("Please log in to post a comment");
      return;
    }

    setIsSubmittingComment({ ...isSubmittingComment, [reviewId]: true });

    try {
      const response = await fetch("/api/reviews/comments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewId,
          content: commentContent,
          parentCommentId: parentCommentId || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Comment posted successfully");
        setCommentForms({ ...commentForms, [reviewId]: "" });
        setReplyingTo({ ...replyingTo, [reviewId]: "" });
        fetchReviews();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmittingComment({ ...isSubmittingComment, [reviewId]: false });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/reviews/delete?reviewId=${reviewId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Review deleted successfully");
        fetchReviews();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete review");
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : star <= rating + 0.5
                ? "fill-yellow-200 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderInteractiveStars = (
    rating: number,
    onRatingChange: (rating: number) => void
  ) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="cursor-pointer hover:scale-110 transition-transform"
            onClick={() => onRatingChange(star)}
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const canSubmitReview = session && userProfile?.role === "customer";
  const isAdmin = session && (userProfile?.role === "admin" || session.user?.email === "eastlachemicals@gmail.com");
  const averageRating = calculateAverageRating();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Reviews</h1>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              {renderStars(Math.round(averageRating), "lg")}
              <span className="text-2xl font-bold text-gray-900">
                {averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-gray-600">
              Over {reviews.length} Review{reviews.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Badge variant="outline" className="mt-2">
            Posts Layout
          </Badge>
        </div>

        {/* Write Review Button */}
        {canSubmitReview && (
          <div className="mb-6 flex justify-end">
            <Button
              onClick={() => setShowReviewForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Write a Review
            </Button>
          </div>
        )}

        {/* Reviews Grid */}
        {reviews.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No reviews yet
            </h3>
            <p className="text-gray-500">
              Be the first to share your experience!
            </p>
          </Card>
        ) : (
          <div
            className={
              layout === "Masonry"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : layout === "List"
                ? "grid grid-cols-1"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }
            style={{
              gap: `${verticalSpacing}px ${horizontalSpacing}px`,
            }}
          >
            {reviews.slice(0, reviewsPerPage).map((review) => (
              <Card
                key={review.id}
                className="bg-white border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  {/* Review Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {review.userName}
                        </h3>
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-green-500 rounded-full">
                          <span className="text-white text-xs">✓</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="mb-3">
                    {renderStars(review.rating)}
                  </div>

                  {/* Review Title */}
                  {review.title && (
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {review.title}
                    </h4>
                  )}

                  {/* Review Content */}
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">
                    {review.content}
                  </p>

                  {/* Comments Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedComments);
                          if (newExpanded.has(review.id)) {
                            newExpanded.delete(review.id);
                          } else {
                            newExpanded.add(review.id);
                          }
                          setExpandedComments(newExpanded);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {review.comments?.length || 0} Comment
                        {(review.comments?.length || 0) !== 1 ? "s" : ""}
                      </button>
                    </div>

                    {/* Comments List */}
                    {expandedComments.has(review.id) && (
                      <div className="space-y-3 mb-4">
                        {review.comments?.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm text-gray-900">
                                    {comment.userName}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">
                                  {comment.content}
                                </p>
                                {session && (
                                  <button
                                    onClick={() =>
                                      setReplyingTo({
                                        ...replyingTo,
                                        [review.id]: comment.id,
                                      })
                                    }
                                    className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
                                  >
                                    <Reply className="w-3 h-3" />
                                    Reply
                                  </button>
                                )}
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (
                                      !confirm(
                                        "Are you sure you want to delete this comment?"
                                      )
                                    )
                                      return;
                                    try {
                                      const response = await fetch(
                                        `/api/admin/reviews/comments/delete?commentId=${comment.id}`,
                                        { method: "DELETE" }
                                      );
                                      if (response.ok) {
                                        toast.success("Comment deleted");
                                        fetchReviews();
                                      }
                                    } catch (error) {
                                      toast.error("Failed to delete comment");
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="ml-10 mt-2 space-y-2">
                                {comment.replies.map((reply) => (
                                  <div
                                    key={reply.id}
                                    className="bg-white rounded p-2 border border-gray-200"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-3 h-3 text-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-xs text-gray-900">
                                            {reply.userName}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {formatDate(reply.createdAt)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-700">
                                          {reply.content}
                                        </p>
                                      </div>
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            if (
                                              !confirm(
                                                "Delete this reply?"
                                              )
                                            )
                                              return;
                                            try {
                                              const response = await fetch(
                                                `/api/admin/reviews/comments/delete?commentId=${reply.id}`,
                                                { method: "DELETE" }
                                              );
                                              if (response.ok) {
                                                toast.success("Reply deleted");
                                                fetchReviews();
                                              }
                                            } catch (error) {
                                              toast.error("Failed to delete");
                                            }
                                          }}
                                          className="text-red-600 hover:text-red-700 h-5 w-5 p-0"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment Form */}
                    {session && (
                      <div className="mt-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder={
                              replyingTo[review.id]
                                ? "Write a reply..."
                                : "Write a comment..."
                            }
                            value={commentForms[review.id] || ""}
                            onChange={(e) =>
                              setCommentForms({
                                ...commentForms,
                                [review.id]: e.target.value,
                              })
                            }
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && e.shiftKey === false) {
                                e.preventDefault();
                                handleSubmitComment(
                                  review.id,
                                  replyingTo[review.id]
                                );
                              }
                            }}
                          />
                          <Button
                            onClick={() =>
                              handleSubmitComment(
                                review.id,
                                replyingTo[review.id]
                              )
                            }
                            disabled={
                              !commentForms[review.id]?.trim() ||
                              isSubmittingComment[review.id]
                            }
                            size="sm"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        {replyingTo[review.id] && (
                          <button
                            onClick={() =>
                              setReplyingTo({
                                ...replyingTo,
                                [review.id]: "",
                              })
                            }
                            className="text-xs text-gray-500 mt-1"
                          >
                            Cancel reply
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {reviews.length > reviewsPerPage && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => setReviewsPerPage(reviewsPerPage + 6)}
            >
              Load More Reviews
            </Button>
          </div>
        )}
      </div>

      {/* Write Review Dialog */}
      <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with other customers
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReview} className="space-y-6 mt-4">
            <div>
              <Label>Rating *</Label>
              <div className="mt-2">
                {renderInteractiveStars(reviewForm.rating, (rating) =>
                  setReviewForm({ ...reviewForm, rating })
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={reviewForm.title}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, title: e.target.value })
                }
                placeholder="Summarize your experience..."
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Your Review *</Label>
              <Textarea
                id="content"
                value={reviewForm.content}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, content: e.target.value })
                }
                placeholder="Tell us about your experience..."
                className="mt-2 min-h-[120px]"
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowReviewForm(false);
                  setReviewForm({ rating: 0, title: "", content: "" });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
