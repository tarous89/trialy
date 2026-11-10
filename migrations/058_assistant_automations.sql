-- Each assistant owns its own runner and the automations it created.
-- ChatGPT and Claude may pause each other's automations but never edit,
-- resume, test or run them. Web (human) owners can manage everything.
-- Existing automations were all created through ChatGPT and stay ChatGPT's.

-- 1. One runner per owner, workspace and assistant.
ALTER TABLE automation_runners ADD COLUMN assistant text NOT NULL DEFAULT 'chatgpt';
ALTER TABLE automation_runners ADD CONSTRAINT automation_runners_assistant CHECK (assistant IN ('chatgpt','claude'));
ALTER TABLE automation_runners DROP CONSTRAINT automation_runners_workspace_id_user_id_key;
ALTER TABLE automation_runners ADD CONSTRAINT automation_runners_owner_assistant UNIQUE (workspace_id,user_id,assistant);

-- 2. How a runner is woken: ChatGPT signed webhooks, or a Claude scheduled task's API trigger.
ALTER TABLE automation_subscriptions ADD COLUMN kind text NOT NULL DEFAULT 'webhook';
ALTER TABLE automation_subscriptions ADD CONSTRAINT automation_subscriptions_kind CHECK (kind IN ('webhook','claude_fire'));

-- 3. Owning assistant of each automation. NULL means created on the web without an assistant.
ALTER TABLE app_monitors ADD COLUMN assistant text CHECK (assistant IN ('chatgpt','claude'));
ALTER TABLE app_actions ADD COLUMN assistant text CHECK (assistant IN ('chatgpt','claude'));
UPDATE app_monitors SET assistant='chatgpt';
UPDATE app_actions SET assistant='chatgpt';

-- 4. Reviews remember the assistant that prepared them, so the other assistant cannot confirm them.
ALTER TABLE app_service_previews ADD COLUMN assistant text CHECK (assistant IN ('chatgpt','claude'));
-- Existing reviews are immutable (service_review_immutable) and expire on their own; they stay untagged.
CREATE FUNCTION trialy_security.default_preview_assistant() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'pg_catalog','public' AS $$
BEGIN
 IF NEW.assistant IS NULL THEN NEW.assistant:=trialy_security.assistant(); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER app_service_previews_assistant BEFORE INSERT ON app_service_previews FOR EACH ROW EXECUTE FUNCTION trialy_security.default_preview_assistant();
