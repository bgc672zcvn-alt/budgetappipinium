-- Create budget versions table for version history
CREATE TABLE public.budget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  version_note TEXT
);

-- Enable RLS
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;

-- Admin users can view all versions
CREATE POLICY "Admin users can view all versions"
  ON public.budget_versions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can insert versions (for auto-save)
CREATE POLICY "Authenticated users can insert versions"
  ON public.budget_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_budget_versions_company_created ON public.budget_versions(company, created_at DESC);

-- Grant admin role to wallborg@ipinium.se
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find user by email
  SELECT id INTO user_record FROM auth.users WHERE email = 'wallborg@ipinium.se';
  
  IF FOUND THEN
    -- Insert admin role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_record.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;