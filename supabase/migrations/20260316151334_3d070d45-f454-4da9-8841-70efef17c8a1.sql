
-- Step 2: Add admin_visible column and update policies (now that 'owner' enum is committed)
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS admin_visible boolean NOT NULL DEFAULT false;

-- Drop old policies
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owner can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view approved transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owner can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update approved transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;

-- Owner sees ALL transactions
CREATE POLICY "Owner can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'));

-- Admin only sees owner-approved (admin_visible = true) transactions
CREATE POLICY "Admins can view approved transactions"
  ON public.transactions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') AND admin_visible = true
  );

-- Owner can update any transaction (approve/reject + set admin_visible)
CREATE POLICY "Owner can update transactions"
  ON public.transactions FOR UPDATE
  USING (public.has_role(auth.uid(), 'owner'));

-- Admin can only update transactions that are already visible to them
CREATE POLICY "Admins can update approved transactions"
  ON public.transactions FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') AND admin_visible = true
  );

-- Also update admin access policies on other tables to include owner role
-- Orders: owner can see all
DROP POLICY IF EXISTS "Owner can view all orders" ON public.orders;
CREATE POLICY "Owner can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owner can update orders" ON public.orders;
CREATE POLICY "Owner can update orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'owner'));

-- Profiles: owner can see all  
DROP POLICY IF EXISTS "Owner can view all profiles" ON public.profiles;
CREATE POLICY "Owner can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owner can update profiles" ON public.profiles;
CREATE POLICY "Owner can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'owner'));

-- Wallets: owner can manage all
DROP POLICY IF EXISTS "Owner can view all wallets" ON public.wallets;
CREATE POLICY "Owner can view all wallets"
  ON public.wallets FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owner can update wallets" ON public.wallets;
CREATE POLICY "Owner can update wallets"
  ON public.wallets FOR UPDATE
  USING (public.has_role(auth.uid(), 'owner'));

-- Support tickets: owner can see all
DROP POLICY IF EXISTS "Owner can view all tickets" ON public.support_tickets;
CREATE POLICY "Owner can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owner can update tickets" ON public.support_tickets;
CREATE POLICY "Owner can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.has_role(auth.uid(), 'owner'));

-- Regional pricing: owner can manage
DROP POLICY IF EXISTS "Owner can manage regional pricing" ON public.regional_pricing;
CREATE POLICY "Owner can manage regional pricing"
  ON public.regional_pricing FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));

-- API providers: owner can manage
DROP POLICY IF EXISTS "Owner can manage providers" ON public.api_providers;
CREATE POLICY "Owner can manage providers"
  ON public.api_providers FOR ALL
  USING (public.has_role(auth.uid(), 'owner'));
