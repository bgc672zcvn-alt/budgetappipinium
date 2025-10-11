-- Add unique constraint on company and year together
-- First drop the existing unique constraint on company (if it exists)
ALTER TABLE public.budget_data DROP CONSTRAINT IF EXISTS budget_data_company_key;

-- Add unique constraint on company and year together
ALTER TABLE public.budget_data ADD CONSTRAINT budget_data_company_year_key UNIQUE (company, year);