# PNMS Product Change Specification (Production Grade)

## 1) Product Intent
PNMS must digitize nursery-farmer operations in a dispute-resistant, audit-friendly way for Indian market users with low technical literacy.

Primary outcomes:
- End-to-end traceability of seed-to-sale lifecycle.
- Transparent dues, payments, and returns.
- Strong role accountability for staff/admin actions.
- Super-admin controlled multi-nursery platform operations.

## 2) Roles and Governance

Roles:
- `SUPER_ADMIN` (platform operator/developer team)
- `NURSERY_ADMIN` (nursery owner/admin)
- `STAFF`
- `CUSTOMER` (replaces old viewer)

Role intent:
- `SUPER_ADMIN`: creates nurseries, assigns/removes nursery admins, manages global banners, sees cross-nursery data.
- `NURSERY_ADMIN`: full nursery-level operations and verification authority.
- `STAFF`: daily operational entries and sales execution.
- `CUSTOMER`: own data visibility, status tracking, and payment interactions.

Security principles:
- No password visibility for any role.
- Immutable finance records (append-only ledger).
- Soft-delete for business entities.

## 3) Must-Have Functional Changes

### 3.1 PlantType transparency
- At PlantType create/edit, `expectedSeedQtyPerBatch` is mandatory.
- This value must be visible in sowing, germination, and customer lifecycle views.
- Purpose: prevent disputes on expected sowing quantity.

### 3.2 Due amount and installments
- Sales support partial payment.
- Track and expose: `grossAmount`, `netAmount`, `paidAmount`, `dueAmount`, `paymentStatus`.
- Due values must be shown in customer screens and reports.

### 3.3 Product returns and adjustments
- Support partial returns against specific sale items.
- Validate returned qty <= sold qty minus prior returns.
- Return action decides inventory behavior (`RESTOCK` or `SCRAP`).
- Refund/due adjustments must be auditable.

### 3.4 Customer module (not viewer)
- Customer can view own lifecycle and financial status.
- Customer can update profile and reset password.
- Customer can raise payment proofs and see verification outcome.

### 3.5 Phone-first authentication
- Login with phone number (email optional fallback).
- Normalize and consistently accept Indian formats: `9876543210`, `919876543210`, `+919876543210`.

### 3.6 Payment verification workflow
- Customer/staff submits payment proof.
- Nursery admin verifies as accept/reject with reason.
- Accept updates paid/due and posts ledger entry.
- Reject keeps due pending and notifies customer.

### 3.7 Staff accountability and accounting
- Every sale/expense must record actor.
- Admin can view staff-wise: sales count, collections, expenses, pending due context.
- Monthly or period staff account summaries maintained.

### 3.8 Admin and super-admin banner system
- Nursery banners by `NURSERY_ADMIN`.
- Global banners by `SUPER_ADMIN`.
- Global priority over nursery banners when rules conflict.

### 3.9 Reports and exports
- Reports include sales, payments, dues, staff contribution, expenses, profitability.
- Export supported for admin roles (PDF/XLSX).
- Nursery-scoped by default; super-admin can run cross-nursery views.

### 3.10 Super-admin multi-nursery management
- Single platform super-admin model.
- Super-admin creates nursery tenants and assigns admins.
- Frontend must not send `ownerSuperAdminId`; backend derives owner from authenticated super-admin.
- Full nursery CRUD required.

## 4) Admin Profile and Contact Requirements
- Nursery admin can configure customer-facing contact details and social handles.
- Customer app should show those contacts/handles clearly for support and trust.
- Nursery payment details (UPI ID, QR image) must be manageable by admin.

## 5) Notification Requirements
- Notify customer on lifecycle milestones:
  - Sowing done
  - Germination updated
  - Product ready
  - Payment accepted/rejected
- In-app notifications mandatory.
- SMS channel optional extension.

## 6) Accounts and Expense Enhancements
- Expense should capture `productDetails`, `purpose`, and `purchasedBy` (staff actor).
- Expense records should roll into staff accounting summaries.
- Ledger entries created for expense postings.

## 7) UX and Farmer Practicality Constraints
- Keep forms minimal and language-simple.
- Use clear statuses and visual dues indicators.
- Show lifecycle numbers transparently:
  - seeds received
  - seeds sown
  - germinated
  - discarded
  - pending
- Avoid hidden calculations; show financial breakdowns plainly.

## 8) Critical Edge Cases to Cover
- Installment overpayment attempt should be blocked or explicitly handled.
- Payment verification race conditions (same proof verified twice).
- Return after full refund should be blocked.
- Inventory cannot go negative.
- Soft-deleted entities should not appear in active workflows.
- Cross-nursery data leakage must be prevented.
- Admin reassignment/removal should not orphan nursery incorrectly.

## 9) Non-Functional Requirements
- All financial operations must be transactional.
- Audit logs required for sensitive actions.
- Immutable ledger policy enforced.
- Backward compatibility maintained where possible via additive fields and migration.
- API contracts documented with sample request/response.

## 10) Migration and Rollout
- Migrate legacy roles to new roles.
- Backfill financial fields for old sales.
- Default/backfill PlantType expected seed quantity.
- Rollout sequence:
  1. schema additions + compatibility layer
  2. migration scripts
  3. enable new write paths
  4. deprecate legacy behavior

## 11) Acceptance Criteria (Ready for Sign-off)
- Super-admin can create, update, view, and soft-delete nursery.
- Nursery admin assigned/removed via super-admin APIs.
- Customer can track own lifecycle and dues.
- Partial payment + verification + due update works end-to-end.
- Returns adjust inventory and financial records correctly.
- Staff logs and staff account summaries are visible to admin.
- Banner priority works (global > nursery).
- Report export works and includes due-focused visibility.
- No plaintext passwords anywhere.
- All critical financial and role actions are auditable.
