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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  StarIcon,
  User,
  Calendar,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { UserProfile } from "@/types/user";

interface Review {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  title: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: "",
    title: "",
    content: "",
  });

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
      const response = await fetch("/api/reviews/list");
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      } else {
        toast.error("Failed to fetch reviews");
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to fetch reviews");
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

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
        body: JSON.stringify(reviewForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setReviewForm({ rating: "", title: "", content: "" });
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

  const renderStars = (
    rating: number,
    interactive: boolean = false,
    onRatingChange?: (rating: number) => void
  ) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${
              interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
            } transition-transform`}
            onClick={() =>
              interactive && onRatingChange && onRatingChange(star)
            }
            disabled={!interactive}
          >
            <Star
              className={`w-5 h-5 ${
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

  const canSubmitReview = session && userProfile?.role === "customer";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Customer Reviews
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our satisfied customers have to say about ELA Chemicals.
              Your feedback helps us continue to provide exceptional service.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Review Submission Section */}
        {canSubmitReview && (
          <Card className="mb-12 bg-white shadow-lg border-0">
            <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <MessageSquare className="w-6 h-6" />
                Share Your Experience
              </CardTitle>
              <p className="text-blue-100 mt-2">
                Help others by sharing your experience with ELA Chemicals
              </p>
            </CardHeader>
            <CardContent className="p-8">
              {!showReviewForm ? (
                <div className="text-center">
                  <Button
                    onClick={() => setShowReviewForm(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Star className="w-5 h-5 mr-2" />
                    Write a Review
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-6">
                  <div>
                    <Label
                      htmlFor="rating"
                      className="text-lg font-semibold text-gray-700"
                    >
                      Rating *
                    </Label>
                    <div className="mt-2">
                      {renderStars(
                        parseInt(reviewForm.rating) || 0,
                        true,
                        (rating) =>
                          setReviewForm({
                            ...reviewForm,
                            rating: rating.toString(),
                          })
                      )}
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="title"
                      className="text-lg font-semibold text-gray-700"
                    >
                      Review Title *
                    </Label>
                    <Input
                      id="title"
                      value={reviewForm.title}
                      onChange={(e) =>
                        setReviewForm({ ...reviewForm, title: e.target.value })
                      }
                      placeholder="Summarize your experience..."
                      className="mt-2 text-lg py-3"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="content"
                      className="text-lg font-semibold text-gray-700"
                    >
                      Your Review *
                    </Label>
                    <Textarea
                      id="content"
                      value={reviewForm.content}
                      onChange={(e) =>
                        setReviewForm({
                          ...reviewForm,
                          content: e.target.value,
                        })
                      }
                      placeholder="Tell us about your experience with our products and service..."
                      className="mt-2 text-lg min-h-[120px]"
                      maxLength={500}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {reviewForm.content.length}/500 characters
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Review"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewForm({ rating: "", title: "", content: "" });
                      }}
                      className="px-8 py-3 rounded-lg font-semibold"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reviews Display */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ThumbsUp className="w-8 h-8 text-blue-600" />
              Customer Testimonials
            </h2>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {reviews.length} Reviews
            </Badge>
          </div>

          {reviews.length === 0 ? (
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  No reviews yet
                </h3>
                <p className="text-gray-500">
                  Be the first to share your experience with ELA Chemicals!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {reviews.map((review) => (
                <Card
                  key={review.id}
                  className="bg-white shadow-lg border-0 hover:shadow-xl transition-shadow duration-300"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {review.userName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {review.userEmail}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Verified
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-600 ml-2">
                        {review.rating}/5
                      </span>
                    </div>
                    <h4 className="font-semibold text-lg text-gray-900 line-clamp-2">
                      {review.title}
                    </h4>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed mb-4 line-clamp-4">
                      {review.content}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(review.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Call to Action for Non-Customers */}
        {!canSubmitReview && session && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Want to share your experience?
              </h3>
              <p className="text-gray-600 mb-4">
                Only customers can submit reviews. If you're a customer, please
                contact support.
              </p>
            </CardContent>
          </Card>
        )}

        {!session && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="text-center py-8">
              <User className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Join our community
              </h3>
              <p className="text-gray-600 mb-4">
                Sign in as a customer to share your experience and help others
                make informed decisions.
              </p>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                Sign In
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
