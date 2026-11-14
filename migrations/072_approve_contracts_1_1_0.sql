-- Owner approval (14 November 2026): publish Contracts (life.contracts) 1.1.0 in place of Contracts 1.0.0. 1.1.0 is new
-- in this deployment: templates/catalog-seed.json names it, so the catalog sync that runs after migrations imports it
-- approved. This one-time update withdraws 1.0.0 (status draft) as listed in templates/catalog-retirements.json. It runs
-- once, so a later operator decision is not undone. Installed 1.0.0 apps keep their saved source and data; digests and
-- schemas are unchanged.
UPDATE app_template_catalog SET status='draft' WHERE template_id='life.contracts' AND version='1.0.0' AND status='approved';
