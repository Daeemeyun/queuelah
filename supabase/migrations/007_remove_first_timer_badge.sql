-- Remove the First Timer badge (first_report) which was deprecated
DELETE FROM user_badges WHERE badge_key = 'first_report';
DELETE FROM badges WHERE key = 'first_report';
