"use client";

import { useEffect, useState } from "react";
import {
  createClientComponentClient,
  Session,
} from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  User,
  Calendar,
  Trash2,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { UserProfile } from "@/types/user";
import { Review } from "@/types/review";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

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
  }, [supabase.auth, filter]);

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
      const approvedOnly = filter === "approved";
      const response = await fetch(
        `/api/reviews/list?approved=${approvedOnly ? "true" : "false"}`
      );
      if (response.ok) {
        const data = await response.json();
        let filteredData = data;
        if (filter === "pending") {
          filteredData = data.filter((r: Review) => !r.isApproved);
        } else if (filter === "approved") {
          filteredData = data.filter((r: Review) => r.isApproved);
        }
        setReviews(filteredData);
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

  const handleApproveReview = async (reviewId: string) => {
    try {
      const response = await fetch(
        `/api/admin/reviews/approve?reviewId=${reviewId}`,
        {
          method: "PATCH",
        }
      );

      if (response.ok) {
        toast.success("Review approved successfully");
        fetchReviews();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve review");
      }
    } catch (error) {
      console.error("Error approving review:", error);
      toast.error("Failed to approve review");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/reviews/delete?reviewId=${reviewId}`,
        {
          method: "DELETE",
        }
      );

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

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAdmin =
    session &&
    (userProfile?.role === "admin" ||
      session.user?.email === "eastlachemicals@gmail.com");

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 text-red-500">
        Access Denied: Admin privileges required
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reviews Management</h1>
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="filter">Filter</Label>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Reviews</div>
            <div className="text-2xl font-bold">{reviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Approved</div>
            <div className="text-2xl font-bold text-green-600">
              {reviews.filter((r) => r.isApproved).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">
              {reviews.filter((r) => !r.isApproved).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">No reviews found</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {review.userName}
                          </h3>
                          <Badge
                            variant={review.isApproved ? "default" : "secondary"}
                          >
                            {review.isApproved ? "Approved" : "Pending"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{review.userEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-600">
                        {review.rating}/5
                      </span>
                    </div>

                    {review.title && (
                      <h4 className="font-semibold text-lg text-gray-900 mb-2">
                        {review.title}
                      </h4>
                    )}

                    <p className="text-gray-700 mb-3">{review.content}</p>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {!review.isApproved && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveReview(review.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
