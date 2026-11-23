-- Tool permissions (docs/TOOL_PERMISSIONS.md), approval screen: the approval footer lists code-lab reviews an assistant
-- prepared. Record which assistant prepared a function, permission or schedule preview, as app_service_previews already
-- does (migration 058); a person's own previews keep NULL. Existing rows keep NULL and are not listed.
ALTER TABLE foundation_previews ADD COLUMN assistant text CHECK (assistant IN ('chatgpt','claude'));
CREATE TRIGGER foundation_previews_assistant BEFORE INSERT ON foundation_previews FOR EACH ROW EXECUTE FUNCTION trialy_security.default_preview_assistant();
