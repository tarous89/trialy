-- Owner approval (12 November 2026): publish Contracts (life.contracts) 1.0.0. The deployment of #140 imported 1.0.0
-- as a draft; templates/catalog-seed.json now names it, so fresh databases import it approved. This one-time update
-- approves that exact version where it is still a draft. It runs once, so a later operator withdrawal is not undone.
-- Digest and schema are unchanged.
UPDATE app_template_catalog SET status='approved' WHERE template_id='life.contracts' AND version='1.0.0' AND status='draft';
