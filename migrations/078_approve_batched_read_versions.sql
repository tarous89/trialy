-- Owner approval (18 November 2026): publish the batched-read release of all 16 switched-on catalog apps in place of the
-- versions they replace. Each new version is the previous one with records.readMany in its single read helper and no
-- feature change. The new versions are new in this deployment: templates/catalog-seed.json names them, so the catalog sync
-- that runs after migrations imports them approved. This one-time update withdraws the replaced versions (status draft), as
-- listed in templates/catalog-retirements.json. It runs once, so a later operator decision is not undone. Installed apps
-- keep their saved source and data; digests and schemas of released versions are unchanged.
UPDATE app_template_catalog SET status='draft' WHERE status='approved' AND (template_id,version) IN (
 ('life.cash-runway','2.2.0'),('life.contracts','1.1.0'),('life.cro-selection','2.1.0'),('life.data-room','1.1.0'),
 ('life.investor-crm','2.0.0'),('life.investor-updates','1.0.0'),('life.partnership-tracker','2.2.0'),('life.project-oversight','2.2.0'),
 ('life.deal-radar','1.0.0'),('life.funding-radar','1.0.0'),('life.literature-radar','2.0.0'),('life.market-radar','1.0.0'),
 ('life.patent-radar','1.0.0'),('life.pipeline-radar','1.0.0'),('life.regulatory-radar','1.0.0'),('life.trial-radar','1.0.0'));
