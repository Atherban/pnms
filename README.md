# PNMS Backend API (Production Refactor v2)

## Changelog

### v2.0.0
- Replaced legacy role model with: `SUPER_ADMIN`, `NURSERY_ADMIN`, `STAFF`, `CUSTOMER`.
- Phone-first authentication added (`/api/auth/login` supports `phoneNumber + password`).
- Added partial-payment support on sales (`paidAmount`, `dueAmount`, `paymentStatus`).
- Added payment verification workflow with proof support (`/api/payments`, `/api/payments/:id/verify`).
- Added immutable financial ledger entries for financial events.
- Added sale return + inventory adjustment flow (`/api/sales/:id/returns`).
- Added super-admin multi-nursery management (`/api/nurseries`).
- Added banner management (`/api/banners`).
- Added report export APIs (`/api/reports/export`, `/api/reports/:id/download`).
- Added staff accounting summary endpoint (`/api/staff-accounts`).
- Added `PlantType.expectedSeedQtyPerBatch` and `PlantType.expectedSeedUnit`.
- Enforced soft-delete behavior in key business entities (customer/expense/plant type).

## Tech Stack
- Node.js (CommonJS)
- Express 5
- MongoDB + Mongoose
- Joi validation
- JWT auth

## Setup

1. Install dependencies:
```bash
npm install
```
2. Configure `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/pnms
JWT_SECRET=replace-with-strong-secret
UPLOADS_BASE_PATH=/absolute/path/to/uploads
```
3. Run migration:
```bash
npm run migrate:v2
```
4. Start server:
```bash
npm run dev
```

Health check:
- `GET /health`

## Roles and Permissions

### Roles
- `SUPER_ADMIN`
- `NURSERY_ADMIN`
- `STAFF`
- `CUSTOMER`

### Access Summary
- `SUPER_ADMIN`: multi-nursery control, reports, global oversight.
- `NURSERY_ADMIN`: full CRUD inside nursery, users, payment verification, banners, reports.
- `STAFF`: operational actions (sowing, germination, inventory, sales, expenses, customers).
- `CUSTOMER`: own lifecycle visibility, dues, payment proof upload, banner visibility.

## API Documentation

### Auth
- `POST /api/auth/login`

### Users
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Nurseries (SUPER_ADMIN)
- `POST /api/nurseries`
- `GET /api/nurseries`
- `POST /api/nurseries/:id/admins`

### Plant Types
- `POST /api/plant-types`
- `GET /api/plant-types`
- `GET /api/plant-types/:id`
- `PATCH /api/plant-types/:id`
- `DELETE /api/plant-types/:id`

### Seeds / Sowing / Germination / Inventory
- `POST /api/seeds`, `GET /api/seeds`, `GET /api/seeds/:id`, `PATCH /api/seeds/:id`, `DELETE /api/seeds/:id`
- `POST /api/sowing`, `GET /api/sowing`
- `POST /api/germination`, `GET /api/germination`
- `POST /api/inventory`, `GET /api/inventory`, `GET /api/inventory/:id`

### Customers
- `POST /api/customers`
- `GET /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`

### Sales / Payments / Returns
- `POST /api/sales`
- `GET /api/sales`
- `GET /api/sales/:id`
- `POST /api/sales/:id/returns`
- `POST /api/payments`
- `GET /api/payments`
- `POST /api/payments/:id/verify`

### Expenses / Labour / Profit
- `POST /api/expenses`, `GET /api/expenses`, `GET /api/expenses/:id`, `PATCH /api/expenses/:id`, `DELETE /api/expenses/:id`
- `POST /api/labours`, `GET /api/labours`, `GET /api/labours/:id`, `PATCH /api/labours/:id`, `DELETE /api/labours/:id`
- `GET /api/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### Banners / Reports / Staff Accounting
- `POST /api/banners`, `GET /api/banners`, `PATCH /api/banners/:id`
- `POST /api/reports/export`
- `GET /api/reports/:id/download`
- `GET /api/staff-accounts`

## Sample Request / Response

### 1) Login (Phone)
`POST /api/auth/login`

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

### 2) Create Sale (Partial Payment)
`POST /api/sales`

Request:
```json
{
  "customer": "65f0c13d4a6d6e0010e53122",
  "items": [
    { "inventoryId": "65f0c16d4a6d6e0010e53123", "quantity": 20 }
  ],
  "paymentMode": "UPI",
  "amountPaid": 100,
  "discountAmount": 20,
  "transactionRef": "UPI-TXN-1001"
}
```

Response (sample fields):
```json
{
  "_id": "65f0c18d4a6d6e0010e53124",
  "saleNumber": "SALE-000123",
  "totalAmount": 240,
  "grossAmount": 240,
  "netAmount": 220,
  "paidAmount": 100,
  "dueAmount": 120,
  "paymentStatus": "PARTIALLY_PAID",
  "verificationStatus": "VERIFIED"
}
```

### 3) Verify Payment
`POST /api/payments/:id/verify`

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
    "amount": 200,
    "mode": "UPI"
  }
}
```

### 4) Export Report
`POST /api/reports/export`

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
    "reportId": "65f0d11d4a6d6e0010e53190",
    "status": "READY",
    "fileName": "sales_1700000000000.xlsx.csv"
  }
}
```

## Postman Collections
- `postman/PNMS-Frontend-QA.postman_collection.json`
- `postman/PNMS-Frontend-QA.postman_environment.json`

Generate/verify:
```bash
npm run qa:reset-seed
npm run postman:build
npm run postman:env:template
npm run postman:verify
```

## Utilities
Reset DB and seed deterministic QA data:
```bash
npm run qa:reset-seed
```

## Notes
- Financial operations run in DB transactions.
- Financial ledger entries are immutable (append-only).
- Legacy role migration mapping is handled in `npm run migrate:v2`.
