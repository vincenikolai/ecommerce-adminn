-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "userName" text NOT NULL,
  "userEmail" text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL,
  content text NOT NULL,
  "isApproved" boolean NOT NULL DEFAULT false,
  "productId" text NULL, -- Optional: link to specific product
  "orderId" text NULL, -- Optional: link to order
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_userId_fkey FOREIGN KEY ("userId") REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT reviews_productId_fkey FOREIGN KEY ("productId") REFERENCES public.products(id) ON DELETE SET NULL,
  CONSTRAINT reviews_orderId_fkey FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Create review_comments table for comments/replies on reviews
CREATE TABLE IF NOT EXISTS public.review_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "reviewId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "userName" text NOT NULL,
  "userEmail" text NOT NULL,
  content text NOT NULL,
  "parentCommentId" uuid NULL, -- For nested replies
  "isApproved" boolean NOT NULL DEFAULT true, -- Comments are auto-approved
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT review_comments_pkey PRIMARY KEY (id),
  CONSTRAINT review_comments_reviewId_fkey FOREIGN KEY ("reviewId") REFERENCES public.reviews(id) ON DELETE CASCADE,
  CONSTRAINT review_comments_userId_fkey FOREIGN KEY ("userId") REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT review_comments_parentCommentId_fkey FOREIGN KEY ("parentCommentId") REFERENCES public.review_comments(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_userId ON public.reviews USING btree ("userId") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_reviews_isApproved ON public.reviews USING btree ("isApproved") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_reviews_createdAt ON public.reviews USING btree ("createdAt" DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews USING btree (rating) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_review_comments_reviewId ON public.review_comments USING btree ("reviewId") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_review_comments_userId ON public.review_comments USING btree ("userId") TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_review_comments_parentCommentId ON public.review_comments USING btree ("parentCommentId") TABLESPACE pg_default;

-- Create trigger for updatedAt
CREATE OR REPLACE FUNCTION update_reviews_updatedat()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_reviews_updatedat
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_reviews_updatedat();

CREATE TRIGGER trg_update_review_comments_updatedat
BEFORE UPDATE ON public.review_comments
FOR EACH ROW
EXECUTE FUNCTION update_reviews_updatedat();

-- Grant permissions
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.review_comments TO authenticated;

