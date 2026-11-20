-- P1/P10: speed as people experience it, kept as daily histograms.
-- A row says how many samples fell into one time bucket. It holds no user, organization, app, record or content identifier.
CREATE TABLE ux_timing_daily (
 day date NOT NULL,
 metric text NOT NULL CHECK(metric IN ('open','interaction','save')),
 host text NOT NULL CHECK(host IN ('web','chatgpt','claude','public')),
 width text NOT NULL CHECK(width IN ('phone','panel','desktop')),
 mode text NOT NULL CHECK(mode IN ('server','browser')),
 bucket_ms integer NOT NULL CHECK(bucket_ms>0),
 samples bigint NOT NULL DEFAULT 0 CHECK(samples>=0),
 PRIMARY KEY(day,metric,host,width,mode,bucket_ms)
);
