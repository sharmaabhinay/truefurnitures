
-- Add new order status values for cancellation and refund flow
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancellation_requested';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refund_requested';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';

-- Extend orders with cancellation/refund fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount numeric(10,2);

-- Security-definer RPC so customers can request cancellation/refund on their own orders
-- without granting broad UPDATE on public.orders.
CREATE OR REPLACE FUNCTION public.request_order_action(
  _order_id uuid,
  _action text,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  new_status order_status;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorised'; END IF;

  IF _action = 'cancel' THEN
    -- Users can cancel outright while nothing is being built yet
    IF o.status NOT IN ('pending_deposit','confirmed') THEN
      RAISE EXCEPTION 'This order can no longer be cancelled directly. Please request a refund.';
    END IF;
    new_status := CASE WHEN o.status = 'pending_deposit' THEN 'cancelled'::order_status
                       ELSE 'cancellation_requested'::order_status END;
    UPDATE public.orders
       SET status = new_status,
           cancellation_reason = _reason,
           cancellation_requested_at = now(),
           cancelled_at = CASE WHEN new_status = 'cancelled' THEN now() ELSE cancelled_at END
     WHERE id = _order_id;
  ELSIF _action = 'refund' THEN
    IF o.status IN ('cancelled','refunded','refund_requested') THEN
      RAISE EXCEPTION 'A refund is not available for this order.';
    END IF;
    UPDATE public.orders
       SET status = 'refund_requested'::order_status,
           refund_reason = _reason,
           refund_requested_at = now()
     WHERE id = _order_id;
  ELSE
    RAISE EXCEPTION 'Unknown action';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.request_order_action(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.request_order_action(uuid, text, text) TO authenticated;
