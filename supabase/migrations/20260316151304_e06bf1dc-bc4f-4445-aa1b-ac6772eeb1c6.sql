
-- Step 1: Add 'owner' enum value only (must be in its own transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
