# Attendance Deployment Runbook

1. **Production backup**: Perform a full database backup before deployment.
2. **Linked-project verification**: Verify both the Customer and Business apps are pointing to the correct production environment.
3. **Pending migration audit**: Check the migration history (`supabase db remote commit`). 
4. **Isolation from the 16 older pending migrations**: Apply ONLY `20260912180000_attendance_tracking.sql`.
5. **Attendance migration checksum**: Validate the sha256 checksum of the migration file.
6. **Isolated migration application method**: Run `psql -f supabase/migrations/20260912180000_attendance_tracking.sql` directly or use Supabase CLI targeting only this file.
7. **Schema verification**: Ensure `provider_attendance_outcome` and `attendance_confirmed_at` are added to the `bookings` table.
8. **Trigger/RPC/grant verification**: Ensure `confirm_booking_attendance` RPC exists and triggers are active.
9. **Production-safe smoke checks**: Run non-destructive selects to ensure RLS still allows customers and providers to view their bookings.
10. **Migration history repair for only 20260912180000**: Insert a record into the Supabase migrations table for this specific version.
11. **Type regeneration**: Run `supabase gen types typescript --local > src/lib/database.types.ts`.
12. **Replacement of manual type edits**: Ensure manual edits in `database.types.ts` are re-applied if overwritten.
13. **App validation**: Deploy frontend apps and do a live check.
14. **Rollback decision point**: If the smoke tests or live check fails, proceed immediately to the rollback plan.
