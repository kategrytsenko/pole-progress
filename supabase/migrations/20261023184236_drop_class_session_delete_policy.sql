-- Stop admins from deleting class_sessions.
-- class_sessions_delete_staff (recreated in 20261012201704_remove_instructor_role.sql)
-- allowed is_admin() to DELETE. bookings.session_id is ON DELETE CASCADE, so that
-- delete removed booking rows and did not restore pass credits.
-- Cancellation is an update of status to 'cancelled'. Insert and update stay
-- admin-only; this file does not replace those policies.
-- Direct client inserts into bookings are unchanged and remain a separate issue.

drop policy if exists "class_sessions_delete_staff" on public.class_sessions;

revoke delete on table public.class_sessions from anon, authenticated;
