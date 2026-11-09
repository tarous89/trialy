-- Publisher-managed global catalog. Application identities cannot approve code.
CREATE TABLE app_template_catalog (
 template_id text NOT NULL,
 version text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved')),
 digest text NOT NULL,
 payload jsonb NOT NULL,
 install_schema jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(template_id,version)
);
ALTER TABLE app_template_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY approved_templates ON app_template_catalog FOR SELECT USING (status='approved');
