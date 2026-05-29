-- When a user deletes their account, their queue reports become anonymous
-- rather than being deleted — the crowd-sourced data remains useful.
-- Previously the FK had no ON DELETE action (defaults to RESTRICT), which
-- would block auth.users deletion if the user had any reports.

ALTER TABLE queue_reports
  DROP CONSTRAINT IF EXISTS queue_reports_user_id_fkey;

ALTER TABLE queue_reports
  ADD CONSTRAINT queue_reports_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
