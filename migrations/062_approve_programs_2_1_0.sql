-- Owner approval (12 November 2026): publish Programs (life.project-oversight) 2.1.0, with the cash forecast
-- and the in-app Runway integration. The deployment of #134 imported 2.1.0 as a draft; templates/catalog-seed.json
-- now names it, so fresh databases import it approved. This one-time update approves that exact version where it
-- is still a draft. It runs once, so a later operator withdrawal is not undone. Digest and schema are unchanged.
UPDATE app_template_catalog SET status='approved' WHERE template_id='life.project-oversight' AND version='2.1.0' AND status='draft';
