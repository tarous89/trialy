-- Owner approval (14 November 2026): publish Fundraise (life.investor-crm) 2.0.0 in place of Investor CRM 1.0.1.
-- 2.0.0 is new in this deployment (it was never imported as a draft): templates/catalog-seed.json names it, so the
-- catalog sync that runs after migrations imports it approved. This one-time update withdraws 1.0.1 (status draft) as
-- listed in templates/catalog-retirements.json. It runs once, so a later operator decision is not undone. Installed
-- 1.0.1 apps keep their saved source and data; digests and schemas are unchanged.
UPDATE app_template_catalog SET status='draft' WHERE template_id='life.investor-crm' AND version='1.0.1' AND status='approved';
