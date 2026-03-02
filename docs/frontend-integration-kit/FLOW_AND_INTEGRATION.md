# PNMS Frontend Flow And API Integration (Postman-Aligned)

## 1) End-to-End Flow (match collection order)

1. Setup and auth:
- Health check.
- Login as `SUPER_ADMIN`.
- Create nursery.
- Create nursery admin user, staff user, customer user.
- Assign nursery admin to nursery.
- Login as nursery admin, staff, and customer.

2. Core create flow:
- Nursery admin creates plant type.
- Staff creates seed.
- Staff creates customer profile.
- Staff creates purchased inventory.
- Staff creates sale.
- Customer creates payment request.
- Nursery admin verifies payment.
- Staff records sowing and germination.
- Nursery admin creates banner.
- Staff creates expense and labour entries.

3. Read/update flow:
- Fetch dashboards/lists/details by role.
- Update entity records allowed by role.
- Run sale return and notification read.

4. Reporting and utility:
- Profit query.
- Export report + download.
- Staff account summary.
- Audit soft-delete logs.

5. Upload flow:
- Plant type image upload.
- Seed image upload.
- Banner image upload.

6. Negative validation tests:
- Run explicit invalid request cases expected to return `400`.

7. Cleanup (optional destructive flow):
- Delete images, delete entities, remove admin, delete nursery.

## 2) Role-based frontend routing

- `SUPER_ADMIN`: nursery + users + assignments + cross-nursery audit/reporting.
- `NURSERY_ADMIN`: plant types, banners, payment verification, reports, staff accounts for own nursery.
- `STAFF`: seeds, sowing, germination, inventory, sales, customers, expenses, labour.
- `CUSTOMER`: profile, banners, own purchases/sales visibility, payment creation.

## 3) Validation rules to enforce in frontend

Use the same constraints as backend Joi schema to prevent avoidable `400`:

- Login: require `password` and either `email` or `phoneNumber`.
- Create user: require name, valid role, valid phone/email, password length by role.
- Create plant type: require `expectedSeedQtyPerBatch`.
- Create seed: `expiryDate > purchaseDate`.
- Create sowing: use `quantity` (not `quantitySown`).
- Payment verify: `REJECT` requires `rejectionReason`.
- Object ID fields: enforce 24-char hex format in forms/select bindings.

## 4) Integration architecture recommendation

- Keep a single HTTP client with:
  - JWT attachment.
  - response unwrapping for both wrapped and raw responses.
  - normalized error mapping (`message` + `details`).
- Use endpoint modules per domain (`authApi`, `salesApi`, etc.) backed by a common client.
- Keep validation functions next to form modules or in a central validation package.
- Block submit when validation fails and show field-level errors.

## 5) Files in this kit

- `pnmsApiClient.ts`: fetch-based API client and endpoint methods.
- `pnmsValidation.ts`: validation utilities aligned with backend Joi requirements.
- `frontend_refactor_prompt_v2.md`: prompt to give to frontend dev/agent.

