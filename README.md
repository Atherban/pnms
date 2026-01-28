# 🌱 Plant Nursery Management System (PNMS) – Backend

## Overview

PNMS is a **production-grade backend system** for managing plant nursery operations such as inventory, seed procurement, sowing, germination, sales, profit analysis, and **admin-controlled user management**.

This backend follows **enterprise standards**:

* JWT-based Authentication (AuthN)
* Role-Based Access Control (AuthZ / RBAC)
* Auditability (who did what and when)
* Transactional integrity (MongoDB transactions)
* Clean architecture (Route → Controller → Service → Model)

---

## Core Principles

### Authentication vs Authorization

* **Authentication**: Verifies who the user is (JWT)
* **Authorization**: Verifies what the user is allowed to do (RBAC)

There is **no public signup**. Users are **provisioned by ADMIN users only**.

---

## Roles

| Role   | Description                         |
| ------ | ----------------------------------- |
| ADMIN  | Full system access, user management |
| STAFF  | Operational actions (sales, sowing) |
| VIEWER | Read-only access                    |

---

## Architecture

```
src/
 ├── routes/
 ├── controllers/
 ├── services/
 ├── models/
 ├── middlewares/
 ├── validations/
 └── exceptions/
```

Each request flows as:

```
Route → authenticate → authorize → validate → controller → service → model
```

---

## Authentication Flow

1. ADMIN creates users via `/api/users`
2. User logs in via `/api/auth/login`
3. JWT issued
4. JWT sent in `Authorization: Bearer <token>`
5. Middleware attaches `req.user = { userId, role }`

---

## User Management (Admin Only)

| Method | Endpoint       | Description    |
| ------ | -------------- | -------------- |
| POST   | /api/users     | Create user    |
| GET    | /api/users     | Get all users  |
| GET    | /api/users/:id | Get user by ID |
| PATCH  | /api/users/:id | Update user    |
| DELETE | /api/users/:id | Disable user   |

Disabled users cannot log in.

---

## Plant Module

| Method | Endpoint                     | Role  |
| ------ | ---------------------------- | ----- |
| POST   | /api/plants                  | ADMIN |
| GET    | /api/plants                  | ALL   |
| GET    | /api/plants/:id              | ALL   |
| PATCH  | /api/plants/:id              | ADMIN |
| PATCH  | /api/plants/:id/quantity     | ADMIN |
| PATCH  | /api/plants/:id/out-of-stock | ADMIN |
| DELETE | /api/plants/:id              | ADMIN |

Plants store audit fields: `createdBy`, `updatedBy`.

---

## Seed Module

| Method | Endpoint       | Role  |
| ------ | -------------- | ----- |
| POST   | /api/seeds     | ADMIN |
| GET    | /api/seeds     | ALL   |
| GET    | /api/seeds/:id | ALL   |
| PATCH  | /api/seeds/:id | ADMIN |
| DELETE | /api/seeds/:id | ADMIN |

---

## Sowing Module (Transactional)

Consumes seed inventory.

| Method | Endpoint    | Role         |
| ------ | ----------- | ------------ |
| POST   | /api/sowing | ADMIN, STAFF |
| GET    | /api/sowing | ADMIN        |

Audit fields: `performedBy`, `roleAtTime`.

---

## Germination Module (Immutable)

| Method | Endpoint         | Role         |
| ------ | ---------------- | ------------ |
| POST   | /api/germination | ADMIN, STAFF |
| GET    | /api/germination | ADMIN        |

Germination records are **observational** and do not affect inventory.

---

## Sales Module (Transactional)

| Method | Endpoint       | Role         |
| ------ | -------------- | ------------ |
| POST   | /api/sales     | ADMIN, STAFF |
| GET    | /api/sales     | ADMIN        |
| GET    | /api/sales/:id | ADMIN        |

Sales:

* Reduce plant inventory
* Capture price snapshot
* Store `performedBy` and `roleAtTime`

---

## Profit Module

| Method | Endpoint                        | Role  |
| ------ | ------------------------------- | ----- |
| GET    | /api/profit?startDate=&endDate= | ADMIN |

---

## Image Uploads

Images are stored in a **global uploads directory**.

| Entity | Endpoint                      |
| ------ | ----------------------------- |
| Plant  | /api/uploads/plants/:id/image |
| Seed   | /api/seeds/:id/image          |

---

## Transactions & Data Integrity

Modules using MongoDB transactions:

* Sales
* Sowing

This guarantees **atomic operations** and prevents partial updates.

---

## Error Handling

All errors flow through a centralized error handler:

* Validation errors (Joi)
* Business errors (ApiError)
* System errors (500)

---

## Security Highlights

* JWT-based authentication
* Role-based authorization
* No public signup
* Password hashing with bcrypt
* Disabled users blocked at login

