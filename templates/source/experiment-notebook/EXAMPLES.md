# Example requests for ChatGPT (and safe expected behavior)

**Create an internal notebook:** “Set up an Experiment Notebook for our preclinical assays, with an experiment log, frozen method versions and individual replicate results.” → Read current catalog and design guidance, reuse authorized schemas or propose seven new roles, ask only for essential missing scientific field definitions; create app without example data or app-level auth.

**Record a new assay:** “Create EXP-2611-005 using protocol pERK v1.3; document the hypothesis, vehicle and two dose arms, and log three numerical replicates per condition.” → Use exact authorized protocol record ID, sources, units and replicate labels; propose each change for trusted review. Never copy data from the fictional preview to production.

**Duplicate a method:** “We changed washing conditions; make a new pERK v1.4 protocol and leave old experiments on v1.3.” → Create distinct Draft version; reject rewriting a referenced revision; no claim of electronic signing.

**Explore results:** “Compare dose groups with sample means and SD; link every point to its source CSV entry.” → Chart only committed same-unit readings with nonempty source; record n, sample SD, control groups and missing points. No significance tests or modelled effect sizes without an explicitly authorized separate statistical workflow.

**Prepare an internal science note:** “Draft an October project summary from completed experiments, with protocol versions and limitations.” → ChatGPT reads only authorized eligible experiment records; report remains Draft until a human approves. Do not email sponsors or invent assay data.

**Optional monitoring:** “Every Monday, check our approved new nonclinical results and notify the team only after we review a memo.” → After user consents, use existing TrialAgents shared ChatGPT runner for research and separately approved TrialAgents Email action on verified status change; owner plus explicitly authorized current team only, no independent app identity/tasks.
