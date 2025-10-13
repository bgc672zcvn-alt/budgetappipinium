-- Enable realtime for budget_data table
ALTER TABLE public.budget_data REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_data;

-- Add user email to budget_versions for tracking who made changes
ALTER TABLE public.budget_versions 
ADD COLUMN IF NOT EXISTS user_email text;

-- Update existing versions to populate user_email from profiles
UPDATE public.budget_versions bv
SET user_email = p.email
FROM public.profiles p
WHERE bv.created_by = p.id AND bv.user_email IS NULL;