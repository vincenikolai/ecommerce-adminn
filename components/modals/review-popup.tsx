"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Star, MessageSquare } from "lucide-react";
import { toast } from "react-hot-toast";

interface ReviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewPopup({ isOpen, onClose }: ReviewPopupProps) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment");
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
          userName: name.trim() || "Anonymous",
          userEmail: "anonymous@example.com", // Since we don't require email
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
