-- Create fortnox_tokens table for OAuth token storage
CREATE TABLE public.fortnox_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company)
);

-- Enable RLS
ALTER TABLE public.fortnox_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage own tokens
CREATE POLICY "Users can manage own tokens"
  ON public.fortnox_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_fortnox_tokens_user_company ON public.fortnox_tokens(user_id, company);

-- Trigger to update updated_at
CREATE TRIGGER update_fortnox_tokens_updated_at
  BEFORE UPDATE ON public.fortnox_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_updated_at();