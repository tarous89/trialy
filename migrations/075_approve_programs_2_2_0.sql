-- Owner approval (15 November 2026): publish Programs (life.project-oversight) 2.2.0 in place of Programs 2.1.0. 2.2.0 is new
-- in this deployment: templates/catalog-seed.json names it, so the catalog sync that runs after migrations imports it
-- approved. This one-time update withdraws 2.1.0 (status draft) as listed in templates/catalog-retirements.json. It runs
-- once, so a later operator decision is not undone. Installed 2.1.0 apps keep their saved source and data; digests and
-- schemas are unchanged.
UPDATE app_template_catalog SET status='draft' WHERE template_id='life.project-oversight' AND version='2.1.0' AND status='approved';
