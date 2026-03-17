-- Assign requested privileged accounts and enforce owner-controlled visibility for secondary admins

-- 1) Orders visibility gate for admins (owner still sees all)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_visible boolean NOT NULL DEFAULT false;

-- Backfill existing rows so currently operational data remains visible
UPDATE public.orders
SET admin_visible = true
WHERE admin_visible IS DISTINCT FROM true;

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view approved orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update approved orders" ON public.orders;

CREATE POLICY "Admins can view approved orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') AND admin_visible = true);

CREATE POLICY "Admins can update approved orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') AND admin_visible = true);

-- 2) Promote specific users by email
WITH owner_user AS (
  SELECT user_id
  FROM public.profiles
  WHERE lower(email) = 'simplesaluja25@gmail.com'
  LIMIT 1
), secondary_user AS (
  SELECT user_id
  FROM public.profiles
  WHERE lower(email) = 'samgho54@gmail.com'
  LIMIT 1
)
INSERT INTO public.user_roles (user_id, role)
SELECT ou.user_id, 'owner'::public.app_role
FROM owner_user ou
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = ou.user_id AND ur.role = 'owner'::public.app_role
);

WITH secondary_user AS (
  SELECT user_id
  FROM public.profiles
  WHERE lower(email) = 'samgho54@gmail.com'
  LIMIT 1
)
INSERT INTO public.user_roles (user_id, role)
SELECT su.user_id, 'admin'::public.app_role
FROM secondary_user su
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = su.user_id AND ur.role = 'admin'::public.app_role
);
