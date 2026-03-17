-- Fix 1: Add RLS policies for wallets table (UPDATE and DELETE for admins)
CREATE POLICY "Admins can update wallets" ON public.wallets
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete wallets" ON public.wallets
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Add INSERT policy for wallets (needed for handle_new_user trigger)
CREATE POLICY "System can insert wallets" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix 3: Update has_role function to add input validation
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs - return false for null values
  IF _user_id IS NULL OR _role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check role
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

-- Fix 4: Add order quantity validation trigger
CREATE OR REPLACE FUNCTION public.validate_order_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_record RECORD;
BEGIN
  -- Get service min/max quantities
  SELECT min_quantity, max_quantity INTO service_record
  FROM public.services WHERE id = NEW.service_id;
  
  -- Validate quantity against service limits
  IF service_record IS NULL THEN
    RAISE EXCEPTION 'Invalid service_id: %', NEW.service_id;
  END IF;
  
  IF NEW.quantity < service_record.min_quantity OR 
     NEW.quantity > service_record.max_quantity THEN
    RAISE EXCEPTION 'Quantity % is outside allowed range [%, %]',
      NEW.quantity, service_record.min_quantity, service_record.max_quantity;
  END IF;
  
  -- Validate quantity is positive
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order validation
DROP TRIGGER IF EXISTS validate_order_quantity ON public.orders;
CREATE TRIGGER validate_order_quantity
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_before_insert();

-- Fix 5: Add admin policies for transactions to properly approve/reject deposits
CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Fix 6: Add admin policies for support_tickets
CREATE POLICY "Admins can view all tickets" ON public.support_tickets
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tickets" ON public.support_tickets
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Fix 7: Add admin policies for ticket_messages
CREATE POLICY "Admins can view all ticket messages" ON public.ticket_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can add ticket messages" ON public.ticket_messages
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 8: Add admin policy for viewing all orders
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Fix 9: Add admin policy for viewing all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));