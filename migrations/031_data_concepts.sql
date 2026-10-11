ALTER TABLE entity_types ADD COLUMN concept text CHECK(concept IS NULL OR concept IN ('person','organization','project','location'));
