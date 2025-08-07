# Auto-Fix CI Workflow Refactor Plan

**Status**: ⏳ Not Started  
**Created**: 2025-08-06  
**Last Updated**: 2025-08-06

## Overview

This plan outlines the refactor of the `.github/workflows/auto-fix-ci-with-claude.yml` workflow to improve readability, reduce duplication, and enhance extensibility. The current YAML-based workflow has redundant logic across jobs, making maintenance difficult. We'll extract core logic into a Python script (`scripts/auto-fix-ci.py`) using libraries like PyGitHub and requests, while keeping the YAML as a minimal orchestrator. This allows easier addition of features like multi-model support, notifications, or custom prompts.

## Progress Tracking

- [ ] **Phase 1**: Analysis & Preparation *(3/3 tasks)* ⏳ *Not Started*
- [ ] **Phase 2**: Python Script Development *(6/6 tasks)* ⏳ *Not Started*
- [ ] **Phase 3**: YAML Workflow Simplification *(4/4 tasks)* ⏳ *Not Started*
- [ ] **Phase 4**: Testing & Validation *(5/5 tasks)* ⏳ *Not Started*
- [ ] **Phase 5**: Documentation & Rollout *(3/3 tasks)* ⏳ *Not Started*

---

## Current Issues Identified

### Critical Problems
1. **Code Duplication** - Identical steps (e.g., PR detection, log downloads, prompt building) repeated in `auto_fix_on_failure` and `fix_on_enable` jobs.
2. **Readability Challenges** - Deeply nested YAML conditionals and bash scripts make logic hard to follow.
3. **Maintenance Overhead** - Adding features requires changes in multiple places, increasing error risk.
4. **Limited Extensibility** - Hard to integrate new logic like alternative AI providers or notifications without YAML bloat.
5. **Error Handling** - Relies on basic `|| true`; no structured logging or recovery.

### Current Limitations
- Hard-coded values (e.g., labels, phrases) scattered throughout.
- No modular configuration for timeouts, models, or behaviors.
- Bash-heavy steps limit complex logic (e.g., conditional branching).
- No centralized error logging or metrics for workflow runs.

---

## Phase 1: Analysis & Preparation
**Status**: ⏳ Not Started  
**Goal**: Gather requirements, set up structure, and identify reusable components.

### Tasks
- [ ] **1.1** Document existing workflow logic  
  Map all jobs, steps, and conditionals into a flowchart or pseudocode. Identify duplicated sections (e.g., label check, log download).  
  **Implementation Notes:**  
  - Use tools like Draw.io for visualization.  
  - Output: `docs/plan/auto-fix-refactor-flowchart.png`.

- [ ] **1.2** Create script directory and config file  
  Add `scripts/` directory with `auto-fix-ci.py` skeleton and `auto-fix-config.json` for settings (e.g., {"enable_label": "auto-fix", "timeout_minutes": 45}).  
  **Implementation Notes:**  
  ```python
  # scripts/auto-fix-ci.py
  import json
  with open('auto-fix-config.json', 'r') as f:
      CONFIG = json.load(f)
  ```  
  - Ensure config is versioned and documented.

- [ ] **1.3** Select Python dependencies  
  Choose libraries: PyGitHub for GitHub API, requests for downloads, click for CLI args. Add to `requirements.txt`.  
  **Implementation Notes:**  
  - Pin versions: e.g., `PyGithub==2.4.0`.  
  - Avoid overkill; keep lightweight.

---

## Phase 2: Python Script Development
**Status**: ⏳ Not Started  
**Goal**: Implement core logic in Python for better control and modularity.

### Tasks
- [ ] **2.1** Implement PR and event handling  
  Create functions to resolve PR from events (workflow_run, issue_comment). Handle different triggers.  
  **Implementation Notes:**  
  ```python
  def resolve_pr(event_type, event_data):
      # Use PyGitHub to fetch PR details
      g = Github(os.getenv('GITHUB_TOKEN'))
      repo = g.get_repo(event_data['repository'])
      # Logic for workflow_run vs comment
      return pr_number, head_sha, head_ref
  ```

- [ ] **2.2** Add label management and checks  
  Functions to check/create/add labels, with deduplication logic.  
  **Implementation Notes:**  
  - Modular: `check_label(pr, label_name) -> bool`.  
  - Include comment posting for reminders.

- [ ] **2.3** Handle log/artifact downloads  
  Download and extract logs/artifacts to a temp dir.  
  **Implementation Notes:**  
  ```python
  import zipfile
  def download_logs(run_id, repo):
      # Use requests to fetch ZIP
      response = requests.get(f"https://api.github.com/repos/{repo}/actions/runs/{run_id}/logs", headers=headers)
      with zipfile.ZipFile(io.BytesIO(response.content)) as z:
          z.extractall('ci-logs')
  ```  
  - Handle unzip fallbacks (e.g., bsdtar).

- [ ] **2.4** Build dynamic prompts  
  Generate Claude prompt from config and context (e.g., run_id, sha).  
  **Implementation Notes:**  
  - Use templates: f-strings or Jinja for flexibility.  
  - Include artifacts index via `os.walk`.

- [ ] **2.5** Integrate Claude invocation  
  Call Claude API or action equivalent from script.  
  **Implementation Notes:**  
  - Use anthropic SDK if needed; pass oauth token.  
  - Add timeout and error retry.

- [ ] **2.6** Add attempt tracking and notifications  
  Check/mark attempts via comments; add extensible notifications (e.g., Slack hook).  
  **Implementation Notes:**  
  - Function: `mark_attempt(pr_number, run_id, message)`.  
  - Configurable: Enable via JSON flag.

---

## Phase 3: YAML Workflow Simplification
**Status**: ⏳ Not Started  
**Goal**: Reduce YAML to invoke the Python script with minimal steps.

### Tasks
- [ ] **3.1** Consolidate jobs  
  Merge into one job per trigger, calling `python scripts/auto-fix-ci.py --event=${{ github.event_name }}`.  
  **Implementation Notes:**  
  - Use `actions/setup-python` to run script.

- [ ] **3.2** Remove duplicated steps  
  Eliminate bash scripts; pass params as args (e.g., `--run-id=${{ github.event.workflow_run.id }}`).  
  **Implementation Notes:**  
  - Keep permissions and concurrency.

- [ ] **3.3** Add script execution step  
  Install deps via `pip install -r requirements.txt`; run script.  
  **Implementation Notes:**  
  - Handle outputs: Script sets GITHUB_OUTPUT.

- [ ] **3.4** Implement error handling in YAML  
  Add steps for logging script failures.  
  **Implementation Notes:**  
  - Use `continue-on-error` selectively.

---

## Phase 4: Testing & Validation
**Status**: ⏳ Not Started  
**Goal**: Ensure refactor maintains functionality and improves maintainability.

### Tasks
- [ ] **4.1** Unit test Python script  
  Write pytest tests for each function (e.g., mock GitHub API).  
  **Implementation Notes:**  
  - Coverage: 80%+; test edge cases like no PR.

- [ ] **4.2** Integration testing  
  Simulate events in a test repo; verify end-to-end flow.  
  **Implementation Notes:**  
  - Use GitHub Actions local runner if possible.

- [ ] **4.3** Compare before/after  
  Run old vs new workflow on sample failures; check outputs.  
  **Implementation Notes:**  
  - Metrics: YAML lines reduced, execution time.

- [ ] **4.4** Add script logging  
  Use logging module for debug/info/error levels.  
  **Implementation Notes:**  
  - Configurable verbosity via env var.

- [ ] **4.5** Validate extensibility  
  Add a mock feature (e.g., email notify) and test addition ease.  
  **Implementation Notes:**  
  - Time to add: <30 min target.

---

## Phase 5: Documentation & Rollout
**Status**: ⏳ Not Started  
**Goal**: Document changes and deploy safely.

### Tasks
- [ ] **5.1** Update README and docs  
  Explain new script usage, config options.  
  **Implementation Notes:**  
  - Add to `docs/workflows.md`.

- [ ] **5.2** Create migration guide  
  For any breaking changes (e.g., secret handling).  
  **Implementation Notes:**  
  - PR template for rollout.

- [ ] **5.3** Deploy and monitor  
  Push to branch; monitor first runs.  
  **Implementation Notes:**  
  - Feature flag: Env var to toggle old/new logic.

---

## Implementation Strategy

### Development Approach
1. **Incremental Build** - Develop script functions matching YAML steps.
2. **Modular Design** - Use classes/functions for each concern (e.g., EventHandler class).
3. **Config-Driven** - All variables in JSON; script validates on load.
4. **Error Resilience** - Wrap in try/except; log stack traces.
5. **Versioning** - Script version check against config.

### Rollout Plan
```yaml
# Feature flag in YAML
if: ${{ vars.USE_PYTHON_AUTO_FIX == 'true' }}
run: python scripts/auto-fix-ci.py
```
- Stage 1: Parallel run (old + new).
- Stage 2: Switch to new; fallback available.
- Monitor: Add workflow metrics job.

### Backward Compatibility
- Preserve all triggers and behaviors.
- Config defaults match current hard-codes.
- Graceful fallback if script fails (run old logic).

---

## Error Handling & Recovery

### Failure Scenarios
1. **API Errors** - Retry with backoff (3 attempts).
2. **Download Failures** - Skip non-essential (e.g., no artifacts).
3. **Script Crashes** - YAML catches and comments on PR.
4. **Config Issues** - Validate JSON; default values.

### Recovery Mechanisms
```python
def safe_execute(func, *args, retries=3):
    for attempt in range(retries):
        try:
            return func(*args)
        except Exception as e:
            logging.warning(f"Attempt {attempt+1} failed: {e}")
            time.sleep(2 ** attempt)
    raise RuntimeError("Max retries exceeded")
```

---

## Security Considerations

### Script Security
- **Token Handling** - Use env vars; never log secrets.
- **Input Validation** - Sanitize event data to prevent injection.
- **Permissions** - Script requests minimal scopes.
- **Dependencies** - Audit and pin versions.

### Implementation Security
```python
# Secure token usage
from github import Github
g = Github(base_url=os.getenv('GITHUB_API_URL'), login_or_token=os.getenv('GITHUB_TOKEN'))
# Validate inputs
import bleach
cleaned_body = bleach.clean(comment_body)
```

---

## Performance Impact

### Optimization Strategies
- Cache API calls where possible.
- Parallel downloads if needed (e.g., logs + artifacts).
- Lightweight deps; no heavy frameworks.

### Performance Metrics
- Execution time: <5 min (vs current ~10 min with setups).
- Memory: <100MB.
- Scalability: Handles large logs via streaming.

---

## Breaking Changes

⚠️ **Minimal breaking changes:**
- New `requirements.txt` for Python deps.
- Potential secret updates if API changes.
- Workflow name remains; behavior identical.

## Benefits

✅ **Key Benefits:**
1. **Readability** - Logic in Python > YAML sprawl.
2. **Maintainability** - Single place for changes.
3. **Extensibility** - Easy to add features (e.g., OpenAI integration).
4. **Error Handling** - Structured and retryable.
5. **Efficiency** - Reduced duplication; faster debugging.
6. **Future-Proof** - Configurable for evolving needs.

---

## Completion Checklist

When marking phases as complete, update the progress tracking section at the top and change status indicators:

- ⏳ Not Started
- 🔄 In Progress  
- ✅ Complete
- ❌ Blocked

**Example of completed task:**
- [x] ~~**1.1** Document existing workflow logic~~ ✅ *Completed 2025-08-06*

**Example of completed phase:**
- [x] **Phase 1**: Analysis & Preparation *(3/3 tasks)* ✅ *Completed 2025-08-06*