# Frontend Integration Kit

Use this folder to align frontend integration with the generated Postman flow.

## Files
- `pnmsApiClient.ts`: central API client with endpoint methods.
- `pnmsValidation.ts`: frontend validators mapped to backend Joi rules.
- `FLOW_AND_INTEGRATION.md`: role-wise sequence and integration architecture.
- `frontend_refactor_prompt_v2.md`: prompt for frontend refactor execution.

## Recommended adoption
1. Copy `pnmsApiClient.ts` into your frontend `src/api/`.
2. Copy `pnmsValidation.ts` into your frontend `src/validation/`.
3. Replace direct API calls with client methods.
4. Wire validation functions into form submit handlers.
5. Use `FLOW_AND_INTEGRATION.md` to organize page/action order.
