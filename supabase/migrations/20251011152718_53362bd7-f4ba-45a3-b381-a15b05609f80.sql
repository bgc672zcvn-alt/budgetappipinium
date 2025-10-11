-- Add year column to budget_data table
ALTER TABLE public.budget_data 
ADD COLUMN IF NOT EXISTS year integer NOT NULL DEFAULT 2025;

-- Create index for better performance when querying by company and year
CREATE INDEX IF NOT EXISTS idx_budget_data_company_year ON public.budget_data(company, year);

-- Update existing records to have year 2026
UPDATE public.budget_data SET year = 2026 WHERE year = 2025;