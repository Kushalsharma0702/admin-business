-- 019_onboarding_notification_default.sql
-- Seeds the default recipient list for Onboarding completion emails, using
-- the same task_type_notification_configs table that already routes every
-- other client-change notification (task_type is just a free string key,
-- "ONBOARDING" isn't a real tasks.task_type). Editable from the Admins page
-- like any other row — that's the point.

INSERT INTO task_type_notification_configs (task_type, email)
VALUES ('ONBOARDING', 'support@diamondaccounts.ca,accounts@diamondaccounts.ca,admin@diamondaccounts.ca')
ON CONFLICT (task_type) DO NOTHING;
