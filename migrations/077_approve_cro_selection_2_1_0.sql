-- Owner approval (15 November 2026): publish CRO Selection (life.cro-selection) 2.1.0 in place of CRO Selection 1.0.1 and
-- Sponsor RFP Management (life.sponsor-rfp-management) 1.0.1. templates/catalog-seed.json names 2.1.0 (and no longer lists
-- Sponsor RFP Management), so the catalog sync that runs after migrations imports 2.1.0 approved. This one-time update
-- withdraws the two replaced versions (status draft) as listed in templates/catalog-retirements.json, and approves 2.1.0
-- if an earlier deployment already imported it as a draft. It runs once, so a later operator decision is not undone.
-- The 2.0.0 draft stays a draft. Installed 1.0.1 apps keep their saved source and data; digests and schemas are unchanged.
UPDATE app_template_catalog SET status='draft' WHERE status='approved' AND ((template_id='life.cro-selection' AND version='1.0.1') OR (template_id='life.sponsor-rfp-management' AND version='1.0.1'));
UPDATE app_template_catalog SET status='approved' WHERE template_id='life.cro-selection' AND version='2.1.0' AND status='draft';
