-- I1: projects are the organizing unit and sit at the top level. Folders are no longer part of the hierarchy.
-- Every project keeps each restriction it inherited: people, assistants, archive state and per-subject access rules.
-- This is a structural migration, so it writes no per-project revision; the folder rows stay as archived history.
DO $$
DECLARE p record; anc record; ar jsonb; users jsonb; ai boolean; arch boolean; cur uuid; guard integer; rules jsonb; merged jsonb; has_rule boolean; changed boolean;
 stronger CONSTANT text[] := ARRAY['inherit','allow','deny'];
BEGIN
 FOR p IN SELECT * FROM workspace_nodes WHERE kind='project' AND parent_id IS NOT NULL ORDER BY id LOOP
  users:=p.allowed_users; ai:=p.ai_enabled; arch:=p.archived; cur:=p.parent_id; guard:=0; changed:=false;
  SELECT permission_rules INTO rules FROM workspaces WHERE id=p.workspace_id;
  WHILE cur IS NOT NULL AND guard<100 LOOP
   SELECT * INTO anc FROM workspace_nodes WHERE id=cur AND workspace_id=p.workspace_id; EXIT WHEN NOT FOUND;
   IF anc.allowed_users IS NOT NULL THEN
    users:=CASE WHEN users IS NULL THEN anc.allowed_users ELSE (SELECT coalesce(jsonb_agg(u),'[]'::jsonb) FROM jsonb_array_elements(users) u WHERE anc.allowed_users @> jsonb_build_array(u)) END;
   END IF;
   ai:=ai AND anc.ai_enabled; arch:=arch OR anc.archived;
   -- A rule on an ancestor applied to the project too. Deny wins over allow, allow over inherit.
   FOR ar IN SELECT r FROM jsonb_array_elements(rules) r WHERE r->>'kind'='project' AND r->>'resourceId'=anc.id::text LOOP
    SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(rules) r WHERE r->>'kind'='project' AND r->>'resourceId'=p.id::text AND r->>'subject'=ar->>'subject') INTO has_rule;
    IF has_rule THEN
     SELECT jsonb_agg(CASE WHEN r->>'kind'='project' AND r->>'resourceId'=p.id::text AND r->>'subject'=ar->>'subject' THEN
       r || jsonb_build_object(
        'read',stronger[greatest(array_position(stronger,coalesce(r->>'read','inherit')),array_position(stronger,coalesce(ar->>'read','inherit')))],
        'write',stronger[greatest(array_position(stronger,coalesce(r->>'write','inherit')),array_position(stronger,coalesce(ar->>'write','inherit')))])
      ELSE r END) INTO merged FROM jsonb_array_elements(rules) r;
     rules:=merged;
    ELSE
     rules:=rules || jsonb_build_array(ar || jsonb_build_object('resourceId',p.id::text));
    END IF;
    changed:=true;
   END LOOP;
   cur:=anc.parent_id; guard:=guard+1;
  END LOOP;
  IF changed THEN UPDATE workspaces SET permission_rules=rules,access_version=access_version+1 WHERE id=p.workspace_id; END IF;
  UPDATE workspace_nodes SET allowed_users=users,ai_enabled=ai,archived=arch,parent_id=NULL,version=version+1 WHERE id=p.id;
 END LOOP;
 UPDATE workspace_nodes SET archived=true,parent_id=NULL,version=version+1 WHERE kind='folder';
END $$;
ALTER TABLE workspace_nodes ADD CONSTRAINT workspace_nodes_top_level CHECK (parent_id IS NULL);
ALTER TABLE workspace_nodes ADD CONSTRAINT workspace_nodes_no_active_folder CHECK (kind='project' OR archived);
