-- Owner approval (15 November 2026): publish the Bio Radars Pipeline, Deal, Funding, Patent, Market and Regulatory Radar 1.0.0
-- and Literature Radar 2.0.0, each an independent app. None was imported before this deployment: templates/catalog-seed.json
-- names them, so the catalog sync that runs after migrations imports them approved. This one-time update withdraws
-- Literature Radar 1.2.2 (status draft), as listed in templates/catalog-retirements.json. It runs once, so a later operator
-- decision is not undone. Installed 1.2.2 apps keep their saved source and data; the 1.2.2 JSON and schemas are unchanged.
UPDATE app_template_catalog SET status='draft' WHERE template_id='life.literature-radar' AND version='1.2.2' AND status='approved';
