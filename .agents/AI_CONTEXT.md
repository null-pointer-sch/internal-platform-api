# AI Context

Read these files before making changes.

## Always-read shared standards

- .engineering-principles/docs/ENGINEERING_PRINCIPLES.md
- .engineering-principles/ai/AI_INSTRUCTIONS.md
- .engineering-principles/standards/REPO_HYGIENE.md
- .engineering-principles/standards/API_RULES.md
- .engineering-principles/standards/SECURITY_RULES.md

## Always-read stack-specific standards

### Backend work
- .engineering-principles/standards/PYTHON_FASTAPI_BACKEND_RULES.md

### Frontend work
- .engineering-principles/standards/ANGULAR_GUIDELINES.md

## Read when relevant

### For API and failure-path changes
- .engineering-principles/standards/ERROR_HANDLING.md

### For UI structure and frontend design changes
- .engineering-principles/standards/UI_ARCHITECTURE.md

### For backend architecture or service-boundary changes
- .engineering-principles/docs/LAYERED_ARCHITECTURE.md
- .engineering-principles/docs/SERVICE_ARCHITECTURE.md

### For code review tasks
- .engineering-principles/ai/AI_CODE_REVIEW.md

### For refactoring tasks
- .engineering-principles/ai/AI_REFACTOR_PROMPT.md
- .engineering-principles/refactoring/REFACTOR_GUIDELINES.md

### Before finalizing meaningful changes
- .engineering-principles/verification/SANITY_CHECKS.md

## Project-local docs

- README.md
- backend/ARCHITECTURE.md
- frontend/ARCHITECTURE.md

## Repository-specific rules

- Preserve existing behavior unless explicitly asked to change it.
- Refactor incrementally.
- Keep changes scoped to the requested area.
- Do not introduce new frameworks or major architectural rewrites.
- Keep the frontend thin.
- Keep business rules and authoritative validation in the backend.
- Keep API contracts explicit.
- Prefer small, auditable diffs over broad rewrites.
- Update docs when structure or responsibilities change.

## Task routing rules

- For backend API changes, read API rules, security rules, backend rules, and error-handling rules.
- For frontend structural changes, read Angular guidelines and UI architecture rules.
- For refactors, read refactoring guidance before changing code.
- For reviews, use the code review guidance explicitly.
- Before finalizing non-trivial changes, run through sanity checks.