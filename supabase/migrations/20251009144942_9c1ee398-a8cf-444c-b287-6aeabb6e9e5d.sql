-- Create table for storing Fortnox comparison data
CREATE TABLE public.fortnox_historical_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  revenue NUMERIC NOT NULL DEFAULT 0,
  cogs NUMERIC NOT NULL DEFAULT 0,
  gross_profit NUMERIC NOT NULL DEFAULT 0,
  personnel NUMERIC NOT NULL DEFAULT 0,
  marketing NUMERIC NOT NULL DEFAULT 0,
  office NUMERIC NOT NULL DEFAULT 0,
  other_opex NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company, year, month)
);

-- Enable RLS
ALTER TABLE public.fortnox_historical_data ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read historical data
CREATE POLICY "Authenticated users can view historical data"
ON public.fortnox_historical_data
FOR SELECT
USING (true);

-- Allow authenticated users to insert/update historical data
CREATE POLICY "Authenticated users can insert historical data"
ON public.fortnox_historical_data
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update historical data"
ON public.fortnox_historical_data
FOR UPDATE
USING (true);

-- Create trigger for updating updated_at
CREATE TRIGGER update_fortnox_historical_data_updated_at
  BEFORE UPDATE ON public.fortnox_historical_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_updated_at();