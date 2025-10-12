-- Add financial_costs column to fortnox_historical_data
ALTER TABLE fortnox_historical_data
ADD COLUMN IF NOT EXISTS financial_costs numeric NOT NULL DEFAULT 0;