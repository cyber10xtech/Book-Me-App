-- Add missing columns to bookings table for customer app
-- These columns store denormalized customer/service info for quick access without joins

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS business_user_id UUID REFERENCES public.auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_name TEXT,
  ADD COLUMN IF NOT EXISTS service_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS booking_time_text TEXT,
  ADD COLUMN IF NOT EXISTS customer_location TEXT;

-- Add index on customer_id for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);

-- Add index on provider_id for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);

-- Add index on booking_date for range queries
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
