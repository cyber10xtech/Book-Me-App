
DROP POLICY "System inserts notifications" ON public.notifications;
CREATE POLICY "Authenticated users insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
