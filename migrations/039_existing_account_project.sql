-- Repair accounts predating automatic Project 1 creation. Archived projects still
-- count as existing: explicitly deleted projects must never be recreated.
WITH eligible AS (
 SELECT w.id AS workspace_id,w.tenant_id,
  (SELECT m.user_id FROM memberships m WHERE m.tenant_id=w.tenant_id AND m.role='owner' ORDER BY m.user_id LIMIT 1) AS owner_id
 FROM workspaces w WHERE NOT w.archived
 AND NOT EXISTS(SELECT 1 FROM workspace_nodes n WHERE n.workspace_id=w.id)
), created AS (
 INSERT INTO workspace_nodes(id,workspace_id,kind,name,parent_id)
 SELECT gen_random_uuid(),workspace_id,'project','Project 1',NULL FROM eligible WHERE owner_id IS NOT NULL
 RETURNING id,workspace_id
)
INSERT INTO audit_events(id,workspace_id,tenant_id,actor_id,action,object_id,origin,after_value,reason)
 SELECT gen_random_uuid(),c.workspace_id,e.tenant_id,e.owner_id,'project.created',c.id,'system',jsonb_build_object('name','Project 1'),'Repair default project initialization for existing account'
 FROM created c JOIN eligible e USING(workspace_id);
