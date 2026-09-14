# Attendance Rollback Plan

To rollback the attendance migration, execute the downward migration steps manually.

1. Drop the triggers on the `bookings` table that prevent editing the attendance columns.
2. Drop the `confirm_booking_attendance` RPC.
3. Alter the `bookings` table to remove the `provider_attendance_outcome` and `attendance_confirmed_at` columns.

**WARNING**: Removing the attendance columns permanently deletes all recorded attendance data. Do not execute this unless you intend to completely remove all provider attendance confirmations.

Do not include credentials or database URIs. Ensure these SQL commands are executed in a safe, isolated manner with a verified script before applying to production.
