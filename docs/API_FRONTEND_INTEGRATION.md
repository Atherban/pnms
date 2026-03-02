# PNMS Frontend API Integration Guide (v2)

This document is the frontend-ready API reference for PNMS backend refactor.

## 1) Base Setup

- Base URL: `http://<host>:<port>`
- Health: `GET /health`
- Auth header for protected routes:
  - `Authorization: Bearer <JWT>`

### Customer Data Consistency Note

- Customer login is from `User` (`role: CUSTOMER`), while customer list/profile screens are from `Customer`.
- Backend now auto-syncs a `Customer` profile for `CUSTOMER` users during:
  - customer user creation
  - customer login
  - customer listing/profile access
- For old data, run one-time backfill:
  - `npm run backfill:customers`

## 2) Roles and Access

Active roles:
- `SUPER_ADMIN`
- `NURSERY_ADMIN`
- `STAFF`
- `CUSTOMER`

### Platform Ownership Clarification

`SUPER_ADMIN` is the platform/developer operator account (your internal PNMS team).  
This role is not a nursery business user role.

High-level access:
- `SUPER_ADMIN`: create/manage nurseries, assign nursery owners/admins, manage users structured by nursery, run global dashboard reports, and manage global banners.
- `NURSERY_ADMIN`: nursery-level management and verification workflows.
- `STAFF`: operational workflows (seed/sowing/germination/inventory/sale/expense/labour/customer).
- `CUSTOMER`: read lifecycle/sales-facing data, create payment requests, view banners.

## 3) Response Contracts

Most endpoints:
```json
{
  "message": "string",
  "data": {}
}
```

Known exceptions:
- Sales endpoints return raw JSON documents/arrays (no wrapper):
  - `POST /api/sales`
  - `GET /api/sales`
  - `GET /api/sales/:id`
- Profit endpoint:
```json
{
  "success": true,
  "data": {
    "period": { "startDate": "ISO", "endDate": "ISO" },
    "totalSales": 0,
    "totalExpenses": 0,
    "totalLabourCost": 0,
    "totalCost": 0,
    "netProfit": 0
  }
}
```
- Report download endpoint returns binary file stream:
  - `GET /api/reports/:id/download`

Error format (global):
```json
{
  "success": false,
  "message": "string",
  "details": ["...optional joi details..."]
}
```

## 4) Shared Enums

Role:
- `SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`, `CUSTOMER`

Payment mode:
- Sale: `CASH`, `UPI`, `ONLINE`
- Payment record: `CASH`, `UPI`, `ONLINE`, `BANK_TRANSFER`

Payment verification action:
- `ACCEPT`, `REJECT`

Payment status:
- `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `CANCELLED`

Sale payment status:
- `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`

Banner scope:
- `GLOBAL_SUPER_ADMIN`, `NURSERY_ADMIN`

Report types:
- `SALES`, `PAYMENT_DUES`, `INVENTORY`, `STAFF_ACCOUNTING`

Report format:
- `PDF`, `XLSX`

## 5) Endpoint Groups (Frontend Mapping)

## 5.1 Auth

### `POST /api/auth/login` (public)
Use for password login with either phone or email.

Request:
```json
{
  "phoneNumber": "9876543210",
  "password": "password123"
}
```
or
```json
{
  "email": "nursery.admin@example.com",
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
      "_id": "65f0...",
      "name": "Nursery Admin",
      "role": "NURSERY_ADMIN",
      "phoneNumber": "+919876543210",
      "nurseryId": "65f1..."
    }
  }
}
```

### `POST /api/auth/change-password` (authenticated)
Request:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

## 5.2 Users (`SUPER_ADMIN`, `NURSERY_ADMIN`)

- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id` (disable)

Frontend handling rule:
- `SUPER_ADMIN`: can view/manage users across nurseries (filter by `nurseryId` in frontend state/view-model).
- `NURSERY_ADMIN`: should be shown only users belonging to current nursery context.

Create user request:
```json
{
  "name": "Staff One",
  "phoneNumber": "9876500001",
  "password": "password123",
  "role": "STAFF",
  "nurseryId": "65f..."
}
```

## 5.3 Nurseries (`SUPER_ADMIN`)

- `POST /api/nurseries`
- `GET /api/nurseries`
- `GET /api/nurseries/:id`
- `PATCH /api/nurseries/:id`
- `DELETE /api/nurseries/:id`
- `POST /api/nurseries/:id/admins`
- `GET /api/nurseries/:id/admins`
- `DELETE /api/nurseries/:id/admins/:adminId`

Purpose:
- Super admin (developer/operator) creates each nursery tenant.
- Super admin assigns nursery owners/admins per nursery.
- Frontend should treat nursery assignment as a required onboarding step.

Create nursery:
```json
{
  "name": "Green Valley Nursery",
  "code": "GVN01",
  "status": "ACTIVE",
  "settings": {
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "paymentConfig": {
      "upiId": "nursery@upi",
      "qrImage": "upi_qr.png"
    }
  }
}
```

Note:
- `ownerSuperAdminId` is not sent by frontend.
- Backend automatically assigns ownership to the authenticated `SUPER_ADMIN`.

Update nursery:
```json
{
  "name": "Green Valley Nursery Updated",
  "status": "SUSPENDED"
}
```

Assign nursery admin:
```json
{
  "adminUserId": "65f...",
  "isPrimary": true
}
```

## 5.4 Plant Types

- `POST /api/plant-types` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `GET /api/plant-types` (all roles)
- `GET /api/plant-types/:id` (all roles)
- `PATCH /api/plant-types/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `DELETE /api/plant-types/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `POST /api/plant-types/:id/image` (multipart)
- `DELETE /api/plant-types/:id/image/:imageId`

Create request:
```json
{
  "name": "Tomato Hybrid",
  "category": "VEGETABLE",
  "variety": "TH-24",
  "lifecycleDays": 45,
  "sellingPrice": 12,
  "expectedSeedQtyPerBatch": 1000,
  "expectedSeedUnit": "SEEDS",
  "minStockLevel": 100,
  "defaultCostPrice": 6
}
```

## 5.5 Seeds / Sowing / Germination / Inventory

Seeds:
- `POST /api/seeds`
- `GET /api/seeds`
- `GET /api/seeds/:id`
- `PATCH /api/seeds/:id`
- `DELETE /api/seeds/:id`
- `POST /api/seeds/:id/image` (multipart)
- `DELETE /api/seeds/:id/image/:imageId`

Sowing:
- `POST /api/sowing`
- `GET /api/sowing`

Germination:
- `POST /api/germination`
- `GET /api/germination`

Inventory:
- `POST /api/inventory` (create purchased inventory)
- `GET /api/inventory`
- `GET /api/inventory/:id`

Sowing request:
```json
{
  "seedId": "65f...",
  "quantity": 1000,
  "sowingDate": "2026-02-01"
}
```

Germination request:
```json
{
  "sowingId": "65f...",
  "germinatedSeeds": 900,
  "discardedSeeds": 100,
  "germinationDate": "2026-02-06"
}
```

## 5.6 Customers

- `POST /api/customers`
- `GET /api/customers`
- `GET /api/customers/me/profile`
- `GET /api/customers/:id`
- `PATCH /api/customers/me/profile`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id` (soft delete)

Create request:
```json
{
  "name": "Farmer One",
  "mobileNumber": "9876543210",
  "address": "Village Road"
}
```

## 5.7 Sales / Payments / Returns

Sales:
- `POST /api/sales` (raw response)
- `GET /api/sales` (raw response)
- `GET /api/sales/:id` (raw response)
- `POST /api/sales/:id/returns`

Payments:
- `POST /api/payments`
- `GET /api/payments`
- `POST /api/payments/:id/verify`

Create sale request:
```json
{
  "customer": "65f...",
  "items": [
    { "inventoryId": "65f...", "quantity": 20 }
  ],
  "paymentMode": "UPI",
  "amountPaid": 100,
  "discountAmount": 20,
  "transactionRef": "UPI-TXN-1001"
}
```

Create sale response (raw document sample):
```json
{
  "_id": "65f...",
  "saleNumber": "SALE-000123",
  "totalAmount": 240,
  "grossAmount": 240,
  "netAmount": 220,
  "paidAmount": 100,
  "dueAmount": 120,
  "paymentStatus": "PARTIALLY_PAID",
  "verificationStatus": "VERIFIED",
  "items": [
    {
      "_id": "65f-item",
      "quantity": 20,
      "priceAtSale": 12,
      "costAtSale": 140
    }
  ]
}
```

Create payment request:
```json
{
  "saleId": "65f...",
  "amount": 120,
  "mode": "UPI",
  "transactionRef": "TXN123",
  "paymentProofFileName": "proof.png"
}
```

Verify payment request:
```json
{
  "action": "ACCEPT"
}
```
or
```json
{
  "action": "REJECT",
  "rejectionReason": "Screenshot mismatch"
}
```

Create sale return:
```json
{
  "items": [
    {
      "saleItemId": "65f-item",
      "quantityReturned": 1,
      "inventoryAction": "RESTOCK"
    }
  ],
  "reason": "Damaged tray"
}
```

## 5.8 Expenses / Labour / Profit

Expenses:
- `POST /api/expenses`
- `GET /api/expenses`
- `GET /api/expenses/:id`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id`

Labour:
- `POST /api/labours`
- `GET /api/labours`
- `GET /api/labours/:id`
- `PATCH /api/labours/:id`
- `DELETE /api/labours/:id`

Profit:
- `GET /api/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

Expense create request:
```json
{
  "type": "FERTILIZER",
  "description": "Micronutrient purchase",
  "purpose": "Growth cycle",
  "productDetails": "5kg pack",
  "amount": 1200,
  "date": "2026-02-10"
}
```

## 5.9 Banners / Reports / Staff Accounts

Banners:
- `POST /api/banners`
- `GET /api/banners`
- `PATCH /api/banners/:id`

Banner ownership model for frontend:
- `SUPER_ADMIN` creates `GLOBAL_SUPER_ADMIN` banners from platform dashboard.
- `NURSERY_ADMIN` creates nursery-scoped banners (`NURSERY_ADMIN` scope).
- Customer/staff UI should display merged active banners by scope precedence:
  - `GLOBAL_SUPER_ADMIN` first
  - then `NURSERY_ADMIN`

Reports:
- `POST /api/reports/export`
- `GET /api/reports/:id/download`

Staff Accounts:
- `GET /api/staff-accounts`

Notifications:
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

Export report request:
```json
{
  "reportType": "SALES",
  "format": "XLSX",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28"
}
```

Export report response:
```json
{
  "message": "Report export generated successfully",
  "data": {
    "reportId": "65f...",
    "status": "READY",
    "fileName": "sales_1700000000000.xlsx.csv"
  }
}
```

## 6) End-to-End Frontend Flows

## Flow A: Super Admin Onboarding
1. Login as `SUPER_ADMIN` (platform developer/operator account).
2. Create nursery tenant.
3. Create nursery owner/admin user (`NURSERY_ADMIN`).
4. Assign nursery admin to nursery.
5. Optionally create initial `STAFF` and `CUSTOMER` users under that nursery.
6. Optionally create global platform banners.

Critical UI state:
- prevent nursery admin screens until nursery + assignment complete.

## Flow B: Nursery Operations Setup
1. Nursery admin login.
2. Create plant type with `expectedSeedQtyPerBatch`.
3. Staff creates seed stock.
4. Staff performs sowing.
5. Staff records germination.
6. Inventory becomes available.

## Flow C: Sales + Partial Payment + Verification
1. Staff creates customer.
2. Staff creates sale with optional `amountPaid`.
3. If due exists, customer/staff submits payment proof.
4. Nursery admin verifies payment (`ACCEPT/REJECT`).
5. UI refreshes `paidAmount`, `dueAmount`, `paymentStatus`.

## Flow D: Return Handling
1. Open sale detail.
2. Select sale item and return quantity.
3. Submit return request.
4. UI updates returned state and adjusted financials.

## Flow E: Reporting and Download
1. Nursery admin/super admin triggers export.
2. Read `reportId` from response.
3. Download file with `/api/reports/:id/download`.
4. Handle binary response.

## 7) Frontend Implementation Notes

1. Normalize API handling for mixed response envelopes:
   - wrapper endpoints: use `response.data.data`
   - sales endpoints: use raw `response.data`
2. Store role and nursery context from JWT login response.
3. Use centralized enum maps in frontend to avoid hardcoded strings spread across screens.
4. For uploads:
   - use `multipart/form-data`
   - field key must be `image`.
5. For report download:
   - set client to handle `blob/arraybuffer`.
6. Validation-safe UX:
   - user/customer phone accepts Indian formats: `9876543210`, `919876543210`, `+919876543210`.
   - backend normalizes phone values before persistence/comparison.
   - auth endpoints continue accepting broader international pattern.
7. Error handling:
   - show `message`
   - if `details` exists, map as field-level errors.

## 8) Quick Frontend Checklist

- [ ] Replace all old role checks with new role list.
- [ ] Add login + change-password screens.
- [ ] Add sale form fields: `amountPaid`, `discountAmount`.
- [ ] Add due badges (`UNPAID`, `PARTIALLY_PAID`, `PAID`).
- [ ] Add payment verification queue for admins.
- [ ] Add sale return UI.
- [ ] Add plant type expected seed quantity fields.
- [ ] Add report export + download UX.
- [ ] Add staff account dashboard table.
- [ ] Add banner listing and admin management screens.

## 9) Complete Endpoint Matrix (Current Backend)

### Auth
- `POST /api/auth/login` (public)
- `POST /api/auth/change-password` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`, `CUSTOMER`)

### Nurseries (`SUPER_ADMIN`)
- `POST /api/nurseries`
- `GET /api/nurseries`
- `GET /api/nurseries/:id`
- `PATCH /api/nurseries/:id`
- `DELETE /api/nurseries/:id`
- `POST /api/nurseries/:id/admins`
- `GET /api/nurseries/:id/admins`
- `DELETE /api/nurseries/:id/admins/:adminId`

### Users (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Plant Types
- `POST /api/plant-types` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `GET /api/plant-types` (all roles)
- `GET /api/plant-types/:id` (all roles)
- `PATCH /api/plant-types/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `DELETE /api/plant-types/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `POST /api/plant-types/:id/image` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `DELETE /api/plant-types/:id/image/:imageId` (`SUPER_ADMIN`, `NURSERY_ADMIN`)

### Seeds
- `POST /api/seeds` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/seeds` (all roles)
- `GET /api/seeds/:id` (all roles)
- `PATCH /api/seeds/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `DELETE /api/seeds/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `POST /api/seeds/:id/image` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `DELETE /api/seeds/:id/image/:imageId` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)

### Sowing / Germination / Inventory
- `POST /api/sowing` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/sowing` (all roles)
- `POST /api/germination` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/germination` (all roles)
- `POST /api/inventory` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/inventory` (all roles)
- `GET /api/inventory/:id` (all roles)

### Customers
- `POST /api/customers` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/customers` (all roles)
- `GET /api/customers/me/profile` (`CUSTOMER`)
- `GET /api/customers/:id` (all roles)
- `PATCH /api/customers/me/profile` (`CUSTOMER`)
- `PATCH /api/customers/:id` (all roles)
- `DELETE /api/customers/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)

### Sales / Returns / Payments
- `POST /api/sales` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `POST /api/sales/:id/returns` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/sales` (all roles)
- `GET /api/sales/:id` (all roles)
- `POST /api/payments` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`, `CUSTOMER`)
- `GET /api/payments` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `POST /api/payments/:id/verify` (`SUPER_ADMIN`, `NURSERY_ADMIN`)

### Expense / Labour / Accounts
- `POST /api/expenses` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/expenses` (all roles)
- `GET /api/expenses/:id` (all roles)
- `PATCH /api/expenses/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `DELETE /api/expenses/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `POST /api/labours` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/labours` (all roles)
- `GET /api/labours/:id` (all roles)
- `PATCH /api/labours/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `DELETE /api/labours/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`)
- `GET /api/staff-accounts` (`SUPER_ADMIN`, `NURSERY_ADMIN`)

### Banners / Notifications / Reports / Profit
- `POST /api/banners` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `GET /api/banners` (all roles)
- `PATCH /api/banners/:id` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `GET /api/notifications` (all roles)
- `PATCH /api/notifications/:id/read` (all roles)
- `GET /api/profit` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `POST /api/reports/export` (`SUPER_ADMIN`, `NURSERY_ADMIN`)
- `GET /api/reports/:id/download` (`SUPER_ADMIN`, `NURSERY_ADMIN`)

## 10) Standard Request/Response Samples for Frontend

### A) Create User
Request:
```json
{
  "name": "Staff One",
  "phoneNumber": "9876500001",
  "password": "12345",
  "role": "STAFF",
  "nurseryId": "65f..."
}
```
Response:
```json
{
  "message": "User created successfully",
  "data": {
    "_id": "65f...",
    "name": "Staff One",
    "phoneNumber": "+919876500001",
    "role": "STAFF",
    "nurseryId": "65f..."
  }
}
```

### B) Create Sale (partial payment)
Request:
```json
{
  "customer": "65f...",
  "items": [{ "inventoryId": "65f...", "quantity": 20 }],
  "paymentMode": "UPI",
  "amountPaid": 100,
  "discountAmount": 20,
  "transactionRef": "UPI-TXN-1001"
}
```
Response (raw document):
```json
{
  "_id": "65f...",
  "saleNumber": "SALE-000123",
  "netAmount": 220,
  "paidAmount": 100,
  "dueAmount": 120,
  "paymentStatus": "PARTIALLY_PAID"
}
```

### C) Create Payment
Request:
```json
{
  "saleId": "65f...",
  "amount": 120,
  "mode": "UPI",
  "transactionRef": "TXN123",
  "paymentProofFileName": "proof.png"
}
```
Response:
```json
{
  "message": "Payment created successfully",
  "data": {
    "_id": "65f...",
    "status": "PENDING_VERIFICATION",
    "amount": 120
  }
}
```

### D) Verify Payment
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
    "_id": "65f...",
    "status": "VERIFIED"
  }
}
```

### E) Export Report
Request:
```json
{
  "reportType": "SALES",
  "format": "XLSX",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28"
}
```
Response:
```json
{
  "message": "Report export generated successfully",
  "data": {
    "reportId": "65f...",
    "status": "READY",
    "fileName": "sales_1700000000000.xlsx.csv"
  }
}
```

## 11) Postman One-Go Run (Role Collection)

Files:
- `postman/PNMS-Frontend-QA.postman_collection.json`
- `postman/PNMS-Frontend-QA.postman_environment.json`

Execution order:
1. Run folder `SUPER_ADMIN`
2. Run folder `NURSERY_ADMIN`
3. Run folder `STAFF`
4. Run folder `CUSTOMER`

Notes:
- Collection pre-request script auto-seeds variables (`runTs`, dynamic nursery name/code, default phones/password).
- Test scripts auto-capture and assign tokens and IDs (`nurseryId`, `plantTypeId`, `seedId`, `saleId`, `paymentId`, etc.).
- Upload requests require manual file selection in Postman for `image`.
