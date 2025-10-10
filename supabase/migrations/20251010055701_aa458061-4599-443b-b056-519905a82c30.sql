-- Create table for tracking Fortnox import jobs
CREATE TABLE IF NOT EXISTS public.fortnox_import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  stats JSONB DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fortnox_import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view their own import jobs"
ON public.fortnox_import_jobs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create their own import jobs"
ON public.fortnox_import_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Users can update their own import jobs"
ON public.fortnox_import_jobs
FOR UPDATE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_fortnox_import_jobs_updated_at
BEFORE UPDATE ON public.fortnox_import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_budget_updated_at();