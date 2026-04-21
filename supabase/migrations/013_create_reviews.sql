-- Reviews table: one review per user per eatery
CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eatery_id     UUID NOT NULL REFERENCES public.eateries(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT CHECK (char_length(body) <= 500),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (eatery_id, user_id)
);

-- Index for fast per-eatery fetch
CREATE INDEX IF NOT EXISTS reviews_eatery_id_idx ON public.reviews (eatery_id, created_at DESC);

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (true);

-- Authenticated users can insert their own review
CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update only their own review
CREATE POLICY "reviews_update" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete only their own review
CREATE POLICY "reviews_delete" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
