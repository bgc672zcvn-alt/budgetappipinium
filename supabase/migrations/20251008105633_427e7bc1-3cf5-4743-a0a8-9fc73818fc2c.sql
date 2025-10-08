-- Create table for storing budget data
CREATE TABLE public.budget_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.budget_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access"
ON public.budget_data
FOR SELECT
TO public
USING (true);

-- Create policy to allow public insert/update
CREATE POLICY "Allow public write access"
ON public.budget_data
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Create trigger to update timestamp
CREATE OR REPLACE FUNCTION public.update_budget_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_budget_data_updated_at
BEFORE UPDATE ON public.budget_data
FOR EACH ROW
EXECUTE FUNCTION public.update_budget_updated_at();