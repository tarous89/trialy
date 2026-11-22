-- L1.0 (docs/scopes/LOADING_SPEED_2026-11-22.md): Apps home, archived apps and templates are timed next to app open,
-- interaction and save. Still daily histograms only: no user, organization, app, record or content identifier.
ALTER TABLE ux_timing_daily DROP CONSTRAINT ux_timing_daily_metric_check;
ALTER TABLE ux_timing_daily ADD CONSTRAINT ux_timing_daily_metric_check CHECK(metric IN ('open','interaction','save','home','archive','templates'));
