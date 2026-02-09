

# 🌱 Plant Nursery Management System (PNMS) – Backend

## Overview

PNMS is a **production-grade backend system** for managing plant nursery operations including:

* Plant catalog (species definitions)
* Seed procurement and usage
* Sowing and germination tracking
* Inventory management
* Sales and profit analysis
* Admin-controlled user management

The system is designed with **enterprise backend principles**:

* JWT-based Authentication (AuthN)
* Role-Based Access Control (RBAC / AuthZ)
* Clear domain separation (definition vs quantity)
* Transactional integrity using MongoDB transactions
* Clean layered architecture
  (**Route → Controller → Service → Model**)

---

## Core Architectural Insight (Most Important)

> **“WHAT something is” must never be mixed with “HOW MUCH exists.”**

To enforce this, the backend separates **master data**, **transactions**, and **inventory**.

### Final Domain Model

```
PlantType        → Definition (WHAT it is)
Seed             → Input batch (raw material)
SowingBatch      → Transactional event
PlantInventory   → Stock (HOW MUCH exists)
Sale             → Consumes inventory
Profit           → Read-only analytics
```

This design:

* Prevents invalid seed–plant combinations
* Eliminates duplicated plant records
* Enables reliable analytics and profit calculation
* Mirrors real ERP / POS / inventory systems

---

## Authentication vs Authorization

### Authentication (AuthN)

Verifies **who the user is** using JWT.

### Authorization (AuthZ / RBAC)

Verifies **what the user is allowed to do** based on role.

There is **no public signup**.
Users are **created and managed by ADMIN users only**.

---

## Roles

| Role   | Description                                       |
| ------ | ------------------------------------------------- |
| ADMIN  | Full system access, user & master data management |
| STAFF  | Operational actions (sowing, sales)               |
| VIEWER | Read-only access                                  |

All protected routes require:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Project Structure

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

Request flow:

```
Route → authenticate → authorize → validate → controller → service → model
```

---

## Authentication Flow

1. ADMIN creates users via `/api/users`
2. User logs in via `/api/auth/login`
3. Backend issues JWT
4. JWT sent in `Authorization` header
5. Middleware attaches:

```js
req.user = { userId, role }
```

---

## 🔐 Authentication API

### Login

**POST** `/api/auth/login`

**Request**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response**

```json
{
  "token": "JWT_TOKEN"
}
```

---

## 👤 User Management (ADMIN Only)

| Method | Endpoint       | Description    |
| ------ | -------------- | -------------- |
| POST   | /api/users     | Create user    |
| GET    | /api/users     | Get all users  |
| GET    | /api/users/:id | Get user by ID |
| PATCH  | /api/users/:id | Update user    |
| DELETE | /api/users/:id | Disable user   |

Disabled users **cannot log in**.

---

## 🌱 PlantType (Master Data)

Represents the **definition / species** of a plant (e.g. Tomato, Rose).

### Create PlantType

**POST** `/api/plant-types` (ADMIN)

**Request**

```json
{
  "name": "Tomato",
  "category": "VEGETABLE",
  "variety": "Cherry"
}
```

### Upload PlantType Image

**POST** `/api/plant-types/:id/image` (ADMIN)

* `multipart/form-data`
* field: `image` (file)

### Get PlantTypes

**GET** `/api/plant-types` (ALL ROLES)

---

## 🌾 Seed Module

Seeds represent **input batches** and always belong to exactly one `PlantType`.

### Create Seed

**POST** `/api/seeds` (ADMIN)

```json
{
  "name": "Tomato Seed Batch A",
  "plantType": "PLANT_TYPE_ID",
  "supplierName": "Agro Corp",
  "totalPurchased": 1000,
  "purchaseDate": "2026-01-01",
  "expiryDate": "2026-12-31"
}
```

### Get Seeds

**GET** `/api/seeds`

### Update Seed

**PATCH** `/api/seeds/:id` (ADMIN)

### Delete Seed (Soft Delete)

**DELETE** `/api/seeds/:id` (ADMIN)

### Upload Seed Image

**POST** `/api/seeds/:id/image` (ADMIN)

---

## 🌱 Sowing Module (Transactional)

Represents the **act of sowing seeds**.

### Sow Seeds

**POST** `/api/sowing` (ADMIN, STAFF)

```json
{
  "seedId": "SEED_ID",
  "quantity": 100
}
```

Behavior:

* Validates seed availability
* Deducts seeds
* Creates `SowingBatch`
* Automatically creates `PlantInventory`

### Get Sowings

**GET** `/api/sowing` (ADMIN)

---

## 🌼 Germination Module (Immutable)

Germination records are **observational only**.

### Record Germination

**POST** `/api/germination` (ADMIN, STAFF)

```json
{
  "sowingId": "SOWING_ID",
  "germinatedSeeds": 80
}
```

### Get Germinations

**GET** `/api/germination` (ADMIN)

---

## 📦 Inventory Module

Tracks **actual stock quantity**.

### Get Inventory

**GET** `/api/inventory`

### Get Inventory By ID

**GET** `/api/inventory/:id`

---

## 💰 Sales Module (Transactional)

Sales consume **PlantInventory**, not PlantType.

### Create Sale

**POST** `/api/sales` (ADMIN, STAFF)

```json
{
  "items": [
    {
      "inventoryId": "INVENTORY_ID",
      "quantity": 2
    }
  ],
  "paymentMode": "CASH"
}
```

Sales:

* Reduce inventory
* Capture price snapshot
* Store `performedBy` and `roleAtTime`

### Get Sales

**GET** `/api/sales` (ADMIN)

### Get Sale By ID

**GET** `/api/sales/:id` (ADMIN)

---

## 📊 Profit Module (Read-Only)

Profit is calculated from **immutable data**.

### Get Profit

**GET**

```
/api/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

**Response**

```json
{
  "success": true,
  "data": {
    "totalSales": 12500,
    "totalExpenses": 4200,
    "totalLabourCost": 3100,
    "totalCost": 7300,
    "netProfit": 5200
  }
}
```

---

## 🖼️ Image Handling

Images are stored **outside the source directory** and served statically.

```
/uploads/<entity>/<entityId>/<filename>
```

### Image Ownership Rules

| Entity                | Purpose                    |
| --------------------- | -------------------------- |
| PlantType.images      | Reference / catalog images |
| PlantInventory.images | Optional real stock images |
| Seed.images           | Seed batch images          |

---

## Transactions & Data Integrity

MongoDB transactions are used in:

* **Sowing**
* **Sales**

This guarantees:

* Atomic updates
* No partial inventory changes
* Strong consistency

---

## Error Handling

Centralized error handling covers:

* Validation errors (Joi)
* Business logic errors (`ApiError`)
* System errors (500)

Consistent error response format.

---

## Security Highlights

* JWT-based authentication
* RBAC enforcement at route level
* No public signup
* Password hashing using bcrypt
* Disabled users blocked at login

---
