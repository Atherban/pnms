# Frontend Refactor Prompt (PNMS v2)

Use this prompt with your frontend agent/team:

---

You are a senior frontend architect. Implement PNMS frontend v2 aligned with backend refactor.

## Objectives
- Remove legacy `ADMIN`/`VIEWER` UI assumptions.
- Support roles: `SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`, `CUSTOMER`.
- Implement phone/email + password auth flows.
- Add partial payments, due tracking, payment proof upload, and verification state UI.
- Add sale returns and inventory adjustment visibility.
- Add nursery management (super-admin only), banners, report exports, and staff accounting screens.
- Preserve backward-compatible UX where possible.

## Required Deliverables
1. Feature-complete UI updates for all role-based flows.
2. `CHANGELOG.md` describing all UI/module changes and breaking changes.
3. `API_INTEGRATION.md` listing endpoints, request payloads, and response mapping.
4. Role-permission matrix for route guards and component-level access.
5. Migration notes from old role model to new role model.

## Backend APIs to Integrate

### Auth
- `POST /api/auth/login`

### Core
- Users: `/api/users/*`
- Nurseries: `/api/nurseries/*`
- Plant types: `/api/plant-types/*`
- Seeds: `/api/seeds/*`
- Sowing: `/api/sowing/*`
- Germination: `/api/germination/*`
- Inventory: `/api/inventory/*`
- Customers: `/api/customers/*`
- Sales: `/api/sales/*`, `/api/sales/:id/returns`
- Payments: `/api/payments/*`
- Expenses: `/api/expenses/*`
- Labours: `/api/labours/*`
- Banners: `/api/banners/*`
- Reports: `/api/reports/export`, `/api/reports/:id/download`
- Staff accounting: `/api/staff-accounts`
- Profit: `/api/profit`

## Required Frontend Changes

### 1) Auth & Session
- Login form supports `phoneNumber + password` and fallback `email + password`.
- Store JWT + role + nursery context.

### 2) Role Guards
- Remove all `ADMIN` checks and replace with `NURSERY_ADMIN`.
- Remove `VIEWER` checks and replace with `CUSTOMER`.
- Implement route gating:
  - `SUPER_ADMIN`: nurseries, global reports, high-level dashboard.
  - `NURSERY_ADMIN`: operational + management modules in own nursery.
  - `STAFF`: operational modules.
  - `CUSTOMER`: own lifecycle/order/payment views.

### 3) Sales & Payments
- Sale form supports:
  - line items
  - `amountPaid`
  - `discountAmount`
  - computed due preview
- Sale detail page shows:
  - `gross/net/paid/due`
  - `paymentStatus`
  - verification state
- Payment proof upload flow for customer/staff.
- Payment verification screen for nursery admin/super admin.

### 4) Returns
- Sale return form for eligible sales.
- Show returned quantity and refund impact in sale timeline.

### 5) PlantType + Lifecycle Transparency
- Plant type form includes `expectedSeedQtyPerBatch` and `expectedSeedUnit`.
- Customer lifecycle pages show sowing/germination/discarded metrics and due amounts.

### 6) Banners + Reports
- Banner list/create/edit pages with scope-aware ordering (`GLOBAL_SUPER_ADMIN` before `NURSERY_ADMIN`) and status.
- Reports screen with export action and download link handling.

### 7) Staff Accounting
- Staff accounts table with sales/collections/expenses/net balance.

## Sample API Contracts

### Login
Request:
```json
{
  "phoneNumber": "9876543210",
  "password": "password123"
}
```
Response:
```json
{
  "message": "Login successful",
  "data": {
    "token": "<jwt>",
    "user": {
      "_id": "65f...",
      "name": "Nursery Admin",
      "role": "NURSERY_ADMIN",
      "phoneNumber": "+919876543210"
    }
  }
}
```

### Create Sale (partial payment)
Request:
```json
{
  "customer": "65f0c13d4a6d6e0010e53122",
  "items": [{ "inventoryId": "65f0c16d4a6d6e0010e53123", "quantity": 20 }],
  "paymentMode": "UPI",
  "amountPaid": 100,
  "discountAmount": 20,
  "transactionRef": "UPI-TXN-1001"
}
```
Response:
```json
{
  "_id": "65f0c18d4a6d6e0010e53124",
  "saleNumber": "SALE-000123",
  "totalAmount": 240,
  "netAmount": 220,
  "paidAmount": 100,
  "dueAmount": 120,
  "paymentStatus": "PARTIALLY_PAID"
}
```

### Verify Payment
Request:
```json
{
  "action": "ACCEPT"
}
```
Response:
```json
{
  "message": "Payment verified successfully",
  "data": {
    "_id": "65f0c21d4a6d6e0010e53130",
    "status": "VERIFIED",
    "amount": 200
  }
}
```

## Non-Negotiables
- No plaintext password visibility UI.
- Strong client-side role checks + server-side trust only from JWT.
- Handle loading/error/empty states for every new endpoint.
- Keep old UI behavior only where explicitly backward compatible.

---
