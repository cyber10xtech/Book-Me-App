-- ==============================================================================
-- EXECUTABLE DATABASE TESTS: Attendance Tracking & Authorization
-- ==============================================================================
-- Instructions:
-- 1. Open the Supabase Dashboard -> SQL Editor.
-- 2. Paste this entire file into a new query.
-- 3. Run the query.
-- 4. If the output says "ALL TESTS PASSED", the logic is sound.
-- 5. The transaction is rolled back at the end, leaving no test data behind.

BEGIN;

DO $$ 
DECLARE
    v_provider_user_id uuid := gen_random_uuid();
    v_customer_user_id uuid := gen_random_uuid();
    v_provider_profile_id uuid := gen_random_uuid();
    v_customer_profile_id uuid := gen_random_uuid();
    v_service_id uuid := gen_random_uuid();
    v_booking_id_completed uuid := gen_random_uuid();
    v_booking_id_future uuid := gen_random_uuid();
    v_booking_id_pending uuid := gen_random_uuid();
    v_error_msg text;
BEGIN
    RAISE NOTICE '--- STARTING ATTENDANCE TESTS ---';

    -- 1. Setup Test Data (Bypass RLS by running as postgres role)
    INSERT INTO auth.users (id) VALUES (v_provider_user_id), (v_customer_user_id);
    
    INSERT INTO public.profiles (id, user_id, role, username) 
    VALUES 
        (v_provider_profile_id, v_provider_user_id, 'provider', 'test_provider_' || gen_random_uuid()),
        (v_customer_profile_id, v_customer_user_id, 'customer', 'test_customer_' || gen_random_uuid());

    INSERT INTO public.services (id, provider_id, name, duration_minutes, price) 
    VALUES (v_service_id, v_provider_profile_id, 'Test Service', 60, 100);

    -- Insert Completed Booking (Past)
    INSERT INTO public.bookings (id, customer_id, provider_id, service_id, status, booking_date, booking_time)
    VALUES (v_booking_id_completed, v_customer_profile_id, v_provider_profile_id, v_service_id, 'completed', current_date - 1, '10:00:00');

    -- Insert Future Completed Booking (Edge case: status completed but time hasn't passed)
    INSERT INTO public.bookings (id, customer_id, provider_id, service_id, status, booking_date, booking_time)
    VALUES (v_booking_id_future, v_customer_profile_id, v_provider_profile_id, v_service_id, 'completed', current_date + 1, '10:00:00');

    -- Insert Pending Booking (Past)
    INSERT INTO public.bookings (id, customer_id, provider_id, service_id, status, booking_date, booking_time)
    VALUES (v_booking_id_pending, v_customer_profile_id, v_provider_profile_id, v_service_id, 'pending', current_date - 1, '10:00:00');

    -- 2. Test Trigger: Prevent Unauthorized Direct Update (Customer trying to set outcome)
    -- We simulate being the customer
    EXECUTE 'SET LOCAL role = authenticated';
    EXECUTE format('SET LOCAL request.jwt.claims = ''{"sub": "%s"}''', v_customer_user_id);

    BEGIN
        UPDATE public.bookings 
        SET provider_attendance_outcome = 'attended' 
        WHERE id = v_booking_id_completed;
        RAISE EXCEPTION 'TEST FAILED: Customer was able to update attendance directly.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%Not authorized%' THEN
            RAISE EXCEPTION 'TEST FAILED: Expected authorization error, got: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: Customer blocked from direct update.';
    END;

    -- 3. Test Trigger: Provider Direct Update (Should work and force timestamp)
    EXECUTE 'SET LOCAL role = authenticated';
    EXECUTE format('SET LOCAL request.jwt.claims = ''{"sub": "%s"}''', v_provider_user_id);

    UPDATE public.bookings 
    SET provider_attendance_outcome = 'attended' 
    WHERE id = v_booking_id_completed;
    
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_id_completed AND attendance_confirmed_at IS NOT NULL) THEN
         RAISE EXCEPTION 'TEST FAILED: Timestamp was not set by trigger.';
    END IF;
    RAISE NOTICE 'PASS: Provider direct update sets timestamp.';

    -- Reset outcome for further RPC testing
    EXECUTE 'SET LOCAL role = postgres';
    EXECUTE 'SET LOCAL request.jwt.claims = ''{}''';
    
    ALTER TABLE public.bookings DISABLE TRIGGER trg_attendance_guard_trigger;
    UPDATE public.bookings SET provider_attendance_outcome = NULL, attendance_confirmed_at = NULL WHERE id = v_booking_id_completed;
    ALTER TABLE public.bookings ENABLE TRIGGER trg_attendance_guard_trigger;

    -- 4. Test RPC: Customer calls RPC (Should fail)
    EXECUTE 'SET LOCAL role = authenticated';
    EXECUTE format('SET LOCAL request.jwt.claims = ''{"sub": "%s"}''', v_customer_user_id);

    BEGIN
        PERFORM public.confirm_booking_attendance(v_booking_id_completed, 'attended');
        RAISE EXCEPTION 'TEST FAILED: Customer was able to call RPC successfully.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%Not authorized%' THEN
            RAISE EXCEPTION 'TEST FAILED: Expected authorization error in RPC, got: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: Customer blocked by RPC.';
    END;

    -- 5. Test RPC: Provider calls RPC on Pending Booking (Should fail)
    EXECUTE 'SET LOCAL role = authenticated';
    EXECUTE format('SET LOCAL request.jwt.claims = ''{"sub": "%s"}''', v_provider_user_id);

    BEGIN
        PERFORM public.confirm_booking_attendance(v_booking_id_pending, 'attended');
        RAISE EXCEPTION 'TEST FAILED: Provider confirmed attendance on pending booking.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%completed%' THEN
            RAISE EXCEPTION 'TEST FAILED: Expected completed error in RPC, got: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: RPC enforces completed status.';
    END;

    -- 6. Test RPC: Provider calls RPC on Future Booking (Should fail)
    BEGIN
        PERFORM public.confirm_booking_attendance(v_booking_id_future, 'attended');
        RAISE EXCEPTION 'TEST FAILED: Provider confirmed attendance on future booking.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%ended%' THEN
            RAISE EXCEPTION 'TEST FAILED: Expected time error in RPC, got: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: RPC enforces time constraints.';
    END;

    -- 7. Test RPC: Provider calls RPC successfully
    PERFORM public.confirm_booking_attendance(v_booking_id_completed, 'no_show');
    
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = v_booking_id_completed AND provider_attendance_outcome = 'no_show' AND attendance_confirmed_at IS NOT NULL) THEN
         RAISE EXCEPTION 'TEST FAILED: RPC did not update booking correctly.';
    END IF;
    RAISE NOTICE 'PASS: RPC successfully sets attendance and timestamp.';

    -- 8. Test RPC: Idempotency (Same outcome should succeed without error)
    BEGIN
        PERFORM public.confirm_booking_attendance(v_booking_id_completed, 'no_show');
        RAISE NOTICE 'PASS: RPC idempotency (identical outcome) works.';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'TEST FAILED: RPC failed on identical retry. %', SQLERRM;
    END;

    -- 9. Test RPC: Idempotency (Different outcome should fail)
    BEGIN
        PERFORM public.confirm_booking_attendance(v_booking_id_completed, 'attended');
        RAISE EXCEPTION 'TEST FAILED: RPC allowed changing the outcome.';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM NOT LIKE '%cannot be changed%' THEN
            RAISE EXCEPTION 'TEST FAILED: Expected lock error in RPC, got: %', SQLERRM;
        END IF;
        RAISE NOTICE 'PASS: RPC idempotency (conflicting outcome) blocked.';
    END;

    RAISE NOTICE '--- ALL TESTS PASSED ---';
END $$;

-- Rollback the transaction to ensure the test leaves no trace
ROLLBACK;
