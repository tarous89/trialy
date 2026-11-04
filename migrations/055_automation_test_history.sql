-- Keep optional test status reads bounded as delivery history grows.
CREATE INDEX automation_test_history ON automation_occurrences(user_id,monitor_id,created_at DESC) WHERE reason='test_run';
CREATE INDEX app_service_test_history ON app_service_jobs(user_id,(payload->'test'->>'automationId'),created_at DESC) WHERE payload->'test'->>'automationId' IS NOT NULL;
