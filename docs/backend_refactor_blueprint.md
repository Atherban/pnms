# PNMS Backend Refactor Blueprint (Production Grade)

## 1) Target Architecture

Adopt domain-oriented modules with explicit boundaries:

- `identity` (auth, users, roles, password-based login)
- `nursery` (nursery tenancy, super-admin ownership, admin assignment)
- `catalog` (plant types, seed expectations, pricing)
- `operations` (seed, sowing, germination, inventory lifecycle, returns)
- `sales` (orders, sale items, attribution, payment schedules)
- `payments` (proof upload, verification, immutable ledger entries)
- `accounting` (staff accounts, expenses, settlement)
- `notifications` (in-app events and delivery state)
- `reporting` (aggregations, PDF/Excel exports)
- `governance` (audit logs, soft delete enforcement)

Keep existing route prefixes (`/api/...`) and response shape where possible. Add V2 endpoints only where behavior fundamentally changes.

Platform clarification:
- `SUPER_ADMIN` represents PNMS platform operators/developers.
- Super admins onboard nurseries, assign nursery owners/admins, run global reporting, and manage global banners.

## 2) Refactored Schema Design

## 2.1 Core Identity & Tenancy

### `User` (updated)
- `_id`
- `nurseryId` (ObjectId, required except SUPER_ADMIN)
- `name` (string, required)
- `email` (string, optional unique sparse)
- `phoneNumber` (string, required, indexed)
- `phoneE164` (string, required, unique)
- `passwordHash` (string, required, select false)
- `role` enum:
  - `SUPER_ADMIN`
  - `NURSERY_ADMIN`
  - `STAFF`
  - `CUSTOMER` (replaces `VIEWER`)
- `status` enum: `ACTIVE`, `DISABLED`
- `mustChangePassword` (bool, default false)
- `createdBy`, `updatedBy`
- `deletedAt`, `deletedBy` (soft delete fields)
- timestamps

Indexes:
- unique `{ phoneE164: 1 }`
- sparse unique `{ email: 1 }`
- `{ nurseryId: 1, role: 1, status: 1 }`

Backward compatibility:
- keep reading legacy role `VIEWER` and map to `CUSTOMER` in service layer and migration.

### `Nursery` (new)
- `_id`
- `name` (required)
- `code` (unique)
- `ownerSuperAdminId` (User ref, required, assigned from authenticated SUPER_ADMIN at create time)
- `status` enum: `ACTIVE`, `SUSPENDED`
- `settings`:
  - `currency`
  - `timezone`
  - `paymentConfig`:
    - `upiId`
    - `qrImage`
- soft delete + timestamps

### `NurseryAdminAssignment` (new)
- `_id`
- `nurseryId`
- `adminUserId`
- `assignedBy`
- `isPrimary` (bool)
- timestamps

API contract note:
- frontend should not send `ownerSuperAdminId` while creating nurseries.
- server derives owner from authenticated `SUPER_ADMIN`.

## 2.2 Customer & Lifecycle Visibility

### `CustomerProfile` (split from current `Customer`)
- `_id`
- `nurseryId`
- `userId` (User ref with role `CUSTOMER`, optional for guest customers)
- `name`
- `phoneE164` (required)
- `address`
- `notes`
- `status` enum: `ACTIVE`, `BLOCKED`
- soft delete + timestamps

### `CustomerLifecycleSubscription` (new)
- `_id`
- `customerId`
- `plantTypeId`
- `enabledEvents` (`SOWED`, `GERMINATED`, `READY_FOR_SALE`, `PAYMENT_ACCEPTED`, `PAYMENT_REJECTED`)
- timestamps

## 2.3 Catalog / PlantType

### `PlantType` (updated)
- existing fields retained
- new:
  - `expectedSeedQtyPerBatch` (number, required, min 1)
  - `expectedSeedUnit` enum: `SEEDS`, `GRAM`, `KG` (default `SEEDS`)
  - `active` (bool, default true)
- soft delete fields + timestamps

Compatibility:
- if `expectedSeedQtyPerBatch` absent in old docs, derive default by migration (e.g., 1) and mark review flag.

## 2.4 Sales, Payments, Accounting

### `Sale` (updated, immutable financial snapshot)
- existing pricing snapshot fields kept
- new:
  - `nurseryId` (required)
  - `saleNumber` (string, unique per nursery)
  - `grossAmount` (number, required)
  - `discountAmount` (number, default 0)
  - `netAmount` (number, required)
  - `paidAmount` (number, default 0)
  - `dueAmount` (number, required)
  - `paymentStatus` enum: `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`
  - `verificationStatus` enum: `NOT_REQUIRED`, `PENDING`, `VERIFIED`, `REJECTED`
  - `staffAttribution`:
    - `soldBy` (User ref required)
    - `collectedBy` (User ref optional)
  - `isVoided` (bool default false)
  - `voidReason` (string)
- timestamps

Constraints:
- `netAmount = grossAmount - discountAmount`
- `dueAmount = netAmount - paidAmount`
- financial snapshot fields never edited directly after posting.

### `Payment` (new)
- `_id`
- `nurseryId`
- `saleId`
- `customerId`
- `amount` (required, > 0)
- `mode` enum: `CASH`, `UPI`, `ONLINE`, `BANK_TRANSFER`
- `status` enum: `PENDING_VERIFICATION`, `VERIFIED`, `REJECTED`, `CANCELLED`
- `proofImage` (file metadata)
- `transactionRef`
- `rejectionReason`
- `receivedAt`
- `verifiedAt`
- `verifiedBy`
- timestamps

Rule:
- payment document status can move only forward; rejected payment cannot mutate to verified.

### `FinancialLedgerEntry` (new, immutable)
- `_id`
- `nurseryId`
- `entryType` enum: `SALE_POSTED`, `PAYMENT_VERIFIED`, `REFUND_POSTED`, `EXPENSE_POSTED`, `INVENTORY_ADJUSTMENT`
- `referenceType`, `referenceId`
- `debit`, `credit`
- `balanceImpact`
- `postedAt`
- `postedBy`
- `meta`
- timestamps

Rule:
- no update/delete. corrections use reversing entries only.

### `StaffAccount` (new)
- `_id`
- `nurseryId`
- `staffUserId`
- `periodStart`, `periodEnd`
- `totalSalesAmount`
- `totalCollectedAmount`
- `totalExpensesRecorded`
- `netAccountableBalance`
- timestamps

## 2.5 Operations / Inventory / Returns

### `InventoryTransaction` (new)
- `_id`
- `nurseryId`
- `inventoryId`
- `type` enum:
  - `INBOUND_GERMINATION`
  - `INBOUND_PURCHASE`
  - `OUTBOUND_SALE`
  - `INBOUND_RETURN`
  - `ADJUSTMENT_LOSS`
  - `ADJUSTMENT_DAMAGE`
  - `ADJUSTMENT_CORRECTION`
- `quantity`
- `unitCostSnapshot`
- `reason`
- `performedBy`
- `referenceType`, `referenceId`
- timestamps

### `SaleReturn` (new)
- `_id`
- `nurseryId`
- `saleId`
- `items[]`:
  - `saleItemId`
  - `quantityReturned`
  - `refundAmount`
  - `inventoryAction` enum: `RESTOCK`, `SCRAP`
- `status` enum: `REQUESTED`, `APPROVED`, `REJECTED`, `COMPLETED`
- `approvedBy`
- `reason`
- timestamps

Rules:
- return quantity cannot exceed sold quantity minus prior returns.
- on `COMPLETED`, create inventory transaction + ledger reversal/refund entries.

## 2.6 Governance, Ads, Notifications, Reports

### `AuditLog` (new)
- `_id`
- `nurseryId`
- `actorUserId`
- `action` (string)
- `entityType`, `entityId`
- `before`, `after` (redacted diff, no secrets)
- `ip`, `userAgent`
- `occurredAt`

### `Notification` (new)
- `_id`
- `nurseryId`
- `userId` (recipient)
- `type` enum:
  - `SOWING_UPDATED`
  - `GERMINATION_UPDATED`
  - `PRODUCT_READY`
  - `PAYMENT_ACCEPTED`
  - `PAYMENT_REJECTED`
  - `DUE_REMINDER`
- `title`, `message`
- `meta`
- `status` enum: `PENDING`, `SENT`, `READ`, `FAILED`
- `scheduledAt`, `sentAt`, `readAt`
- timestamps

### `Banner` (new)
- `_id`
- `scope` enum: `GLOBAL_SUPER_ADMIN`, `NURSERY_ADMIN`
- `nurseryId` (required for nursery scope)
- `title`
- `image`
- `redirectUrl`
- `priority` (int)
- `startAt`, `endAt`
- `status` enum: `DRAFT`, `ACTIVE`, `EXPIRED`
- `createdBy`
- timestamps

Serving rule:
- merge active banners; `GLOBAL_SUPER_ADMIN` wins on equal/higher priority.

### `ReportJob` (new async export)
- `_id`
- `nurseryId`
- `reportType` enum: `SALES`, `PAYMENT_DUES`, `INVENTORY`, `STAFF_ACCOUNTING`
- `filters`
- `format` enum: `PDF`, `XLSX`
- `status` enum: `QUEUED`, `PROCESSING`, `READY`, `FAILED`
- `file`
- `requestedBy`
- timestamps

## 3) New / Updated Service Logic

## 3.1 Authentication (Phone-first, Password)

- `POST /api/auth/login`
  - Backward compatible input: accept `email+password` OR `phoneNumber+password`.
  - Prefer phone lookup first when both provided.
- remove any password-read endpoints.

Security:
- rate limiting by phone/IP
- lockout policy for repeated failures
- JWT includes `userId`, `role`, `nurseryId`, `tokenVersion`

## 3.2 Sale + Partial Payment Flow

Transaction boundary (`mongoose.startSession`) for:
- inventory deduction
- sale create
- initial payment create (optional)
- ledger postings
- staff account update
- audit log append

Flow:
1. Validate requested quantities via FIFO.
2. Create sale snapshot with `gross/net/paid/due`.
3. If payment proof supplied, create `Payment` in `PENDING_VERIFICATION`.
4. If immediate verified cash, post payment and ledger atomically.
5. Update `paymentStatus`.
6. Emit notification and audit event.

## 3.3 Payment Verification Workflow

`verifyPayment(paymentId, action, reason, actor)` transaction:
1. Lock payment and sale documents.
2. Ensure current status is `PENDING_VERIFICATION`.
3. On accept:
   - set payment `VERIFIED`
   - increment `sale.paidAmount`
   - recompute `sale.dueAmount/paymentStatus`
   - create ledger `PAYMENT_VERIFIED`
   - update staff collected attribution
4. On reject:
   - set payment `REJECTED` with reason
5. create notification + audit log.

## 3.4 Product Return & Inventory Adjustment

`processSaleReturn(returnRequest)` transaction:
1. Validate allowed return quantity.
2. Create `SaleReturn`.
3. Restock or scrap inventory via `InventoryTransaction`.
4. Recompute sale financial summary; do not mutate old ledger entries.
5. Post reversal/refund ledger entries.
6. mark return completed and notify customer.

## 3.5 Staff-wise Attribution & Accounting

- every sale/write operation requires `performedBy`.
- periodically or real-time update `StaffAccount`.
- enforce that staff can only create records in own nursery.

## 3.6 Customer Notifications

Domain events:
- `SOWING_CREATED`
- `GERMINATION_RECORDED`
- `INVENTORY_READY_FOR_SALE`
- `PAYMENT_VERIFIED`
- `PAYMENT_REJECTED`
- `DUE_DATE_APPROACHING`

Event handlers create in-app notifications and optional SMS hooks.

## 4) Migration Strategy

Run in phased, backward-compatible migrations.

## Phase 0: Pre-deploy
- add new fields as optional.
- deploy dual-read logic (`role`, login identifiers, payment summaries).

## Phase 1: Data Migration Scripts
- `VIEWER` -> `CUSTOMER` role mapping.
- normalize phone numbers into E.164 for users/customers.
- create default `Nursery` for existing single-tenant data.
- assign all current records with `nurseryId`.
- backfill `Sale`:
  - `grossAmount = totalAmount`
  - `netAmount = totalAmount`
  - `paidAmount = totalAmount` (for historical fully paid sales unless evidence exists)
  - `dueAmount = 0`
  - `paymentStatus = PAID`
- backfill `PlantType.expectedSeedQtyPerBatch` with safe default + report exceptions.

## Phase 2: Enable New Writes
- start writing `Payment`, `LedgerEntry`, `InventoryTransaction`, `AuditLog`.
- keep old sale endpoints operational; enrich responses with new fields.

## Phase 3: Deprecation
- deprecate email-only login.
- deprecate legacy role constants in validation.
- remove any UI/API that attempted password visibility.

## Phase 4: Hardening
- enforce required `nurseryId` and immutable ledger policy.

## 5) Roles and Permissions (Clear Separation)

- `SUPER_ADMIN`
  - create/update nurseries
  - assign/revoke nursery owners/admins
  - platform-level user management structured by nursery
  - global banners from platform dashboard
  - cross-nursery reports
  - full read audit access
- `NURSERY_ADMIN`
  - full CRUD within own nursery
  - payment verification
  - staff management
  - nursery banners
  - reports/export
- `STAFF`
  - operational CRUD: sowing, germination, inventory, sales creation
  - create payment requests/proof
  - no user-role management
  - no cross-nursery visibility
- `CUSTOMER`
  - own profile
  - own orders, dues, lifecycle tracking
  - upload payment proof
  - receive notifications

Compatibility mapping:
- where old middleware expects `VIEWER`, temporarily allow `CUSTOMER` and `VIEWER` until migration completion.

## 6) API Compatibility Plan

- preserve existing endpoints:
  - `/api/auth/login`
  - `/api/sales/*`
  - `/api/customers/*`
- add additive fields in responses (`paidAmount`, `dueAmount`, `paymentStatus`).
- add new endpoints:
  - `/api/payments`
  - `/api/payments/:id/verify`
  - `/api/sales/:id/returns`
  - `/api/banners`
  - `/api/reports/export`

## 7) Security and Integrity Controls

- all financial mutations in DB transactions
- immutable ledger (append-only)
- soft delete for business entities, hard delete only for technical artifacts
- input validation with strict schemas and role guards
- secrets never logged in audit trails
- proof uploads scanned/validated by type and size

## 8) Suggested Implementation Sequence

1. introduce tenancy (`Nursery`, `nurseryId`) and role enum expansion.
2. phone-first auth + password reset flow.
3. payment + ledger + verification workflow.
4. partial payments and due tracking on sale.
5. sale returns + inventory adjustment transactions.
6. notifications + banners.
7. async report exports PDF/XLSX.
8. enforce immutable finance + complete deprecation cleanup.
