-- Owner approval (14 November 2026): publish Partnerships (life.partnership-tracker) 2.1.0 in place of Partnership
-- Tracker 1.1.1. 2.1.0 is new in this deployment: templates/catalog-seed.json names it, so the catalog sync that runs
-- after migrations imports it approved. The 2.0.0 draft imported by the deployment of #164 stays a draft (it was never
-- released; 2.1.0 supersedes it). This one-time update withdraws 1.1.1 (status draft) as listed in
-- templates/catalog-retirements.json. It runs once, so a later operator decision is not undone. Installed 1.1.1 apps
-- keep their saved source and data; digests and schemas are unchanged.
UPDATE app_template_catalog SET status='draft' WHERE template_id='life.partnership-tracker' AND version='1.1.1' AND status='approved';
