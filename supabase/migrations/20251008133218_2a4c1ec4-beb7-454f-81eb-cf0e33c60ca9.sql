-- Create comments table for budget data
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  target_field TEXT NOT NULL,
  target_month TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can view all comments
CREATE POLICY "Authenticated users can view all comments"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert their own comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_comments_company_field ON public.comments(company, target_field, target_month);

-- Trigger for updated_at
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_updated_at();