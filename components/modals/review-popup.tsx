"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Star, MessageSquare, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

interface ReviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewPopup({ isOpen, onClose }: ReviewPopupProps) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user?.id) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, first_name, last_name")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (profile) {
          setUserRole(profile.role);
          // Pre-fill name with user's actual name
          const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
          if (fullName) {
            setName(fullName);
          }
        }
      }
      setLoading(false);
    };

    getSessionAndProfile();
  }, [supabase.auth]);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    // Check if user is authenticated and is a customer
    if (!session) {
      toast.error("Please sign in to submit a review");
      router.push("/sign-in");
      onClose();
      return;
    }

    if (userRole !== "customer") {
      toast.error("Only customers can submit reviews");
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/reviews/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: name.trim() || "Customer",
          userEmail: session.user.email || "customer@example.com",
          rating: rating,
          title: "Customer Review",
          content: comment.trim(),
        }),
      });

      if (response.ok) {
        toast.success("Thank you for your review!");
        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setComment("");
    setRating(5);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Write a Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name Field (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Name (Optional)
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (leave blank for anonymous)"
              className="w-full"
            />
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Rating</label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {rating} star{rating !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Comment *
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with our products..."
              className="w-full min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-500">
              {comment.length}/500 characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            {loading ? (
              <Button disabled className="flex-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </Button>
            ) : !session ? (
              <Button
                onClick={() => {
                  router.push("/sign-in");
                  onClose();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <User className="h-4 w-4 mr-2" />
                Sign In to Review
              </Button>
            ) : userRole !== "customer" ? (
              <Button disabled className="flex-1 bg-gray-400">
                <X className="h-4 w-4 mr-2" />
                Customers Only
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !comment.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
