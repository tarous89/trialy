-- Exchange rooms: a level's entry step can be recorded as met for one person by the workspace (reviewed set_exchange_levels with
-- `entered`, for example a CDA already signed elsewhere or on file in Contracts). Same rule as before, plus that recorded entry.
CREATE OR REPLACE FUNCTION trialy_security.exchange_level_open(exchange_ref uuid,group_ref uuid,level_key text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE l jsonb; e record;
BEGIN
 SELECT * INTO e FROM exchanges WHERE id=exchange_ref;
 IF NOT FOUND OR NOT (e.levels ? level_key) THEN RETURN false; END IF;
 SELECT v INTO l FROM exchange_groups g CROSS JOIN LATERAL jsonb_array_elements(g.levels) v WHERE g.id=group_ref AND v->>'key'=level_key;
 IF l IS NULL THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM exchange_events WHERE exchange_id=exchange_ref AND kind='level_entry_recorded' AND detail->>'level'=level_key) THEN RETURN true; END IF;
 IF l->>'entry'='click_through' THEN RETURN EXISTS(SELECT 1 FROM exchange_events WHERE exchange_id=exchange_ref AND kind='level_acknowledged' AND detail->>'level'=level_key); END IF;
 IF l->>'entry'='signed_document' THEN RETURN EXISTS(SELECT 1 FROM exchange_files f JOIN exchange_file_acceptances a ON a.file_id=f.id WHERE f.exchange_id=exchange_ref AND f.slot=l->>'slot'); END IF;
 RETURN true;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA trialy_security FROM PUBLIC;
