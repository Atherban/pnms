# Prompt: Refactor Frontend API Integration For PNMS (Collection-Aligned)

You are refactoring PNMS frontend integration using these artifacts:
- `postman/PNMS-Frontend-QA.postman_collection.json`
- `postman/PNMS-Frontend-QA.postman_environment.json`
- `docs/frontend-integration-kit/pnmsApiClient.ts`
- `docs/frontend-integration-kit/pnmsValidation.ts`
- `docs/frontend-integration-kit/FLOW_AND_INTEGRATION.md`

## Goal
Implement robust frontend API integration aligned with backend validation and role flow. Reduce avoidable `400` responses through frontend validation and flow-safe UI sequencing.

## Required implementation

1. API layer
- Replace ad-hoc fetch/axios calls with a centralized client.
- Ensure Bearer token injection.
- Support wrapped (`{message,data}`) and raw JSON responses.
- Normalize error messages from API responses.

2. Role-aware flow
- Implement route guards for roles:
  - SUPER_ADMIN, NURSERY_ADMIN, STAFF, CUSTOMER
- Preserve nursery scoping in all views.
- Prevent cross-role actions in UI (hide/disable forbidden actions).

3. Form validation
- Add client-side validation that mirrors backend Joi constraints for:
  - login/auth flows
  - user creation
  - plant type creation
  - seed creation
  - sowing creation
  - payment verification
- Do not submit if validation fails; show inline field errors.

4. Flow sequencing
- Reflect dependency order in UI actions:
  - nursery -> users -> assignment -> operational entities -> sale/payment -> reports
- Auto-store IDs from successful creates in state/store where required.

5. Upload and binary handling
- Handle multipart image upload for plant type, seed, banner.
- Handle report download as blob and trigger file save.

6. QA matrix
- Add positive and negative frontend tests based on Postman collection cases.
- Include explicit expected `400` UI paths (validation errors shown before API call where possible).

## Output deliverables
- Refactored API integration module(s)
- Updated forms with validation
- Role-permission matrix for frontend routes/components
- Flow documentation for onboarding
- Short migration note describing old vs new integration behavior
