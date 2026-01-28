# Plant Nursery Management System (PNMS) – Backend

## Overview

This backend powers the **Plant Nursery Management System**, designed with **production-grade architecture** and **domain-driven decisions**.

The system manages:

* Master data (Plants, Seeds)
* Inventory-affecting events (Sales, Sowing, Germination)
* Derived reports (Profit)
* Media uploads (Images)

The backend follows **best practices**:

* Layered architecture (Routes → Controllers → Services → Models)
* Strict validation
* Transaction safety for financial & inventory operations
* No blind CRUD on historical data

---

## Tech Stack

* **Node.js + Express** – API framework
* **MongoDB + Mongoose** – Database & ODM
* **Joi** – Request validation
* **Multer** – File uploads
* **Helmet** – Security headers
* **Docker (Replica Set)** – Transaction support

---

## Folder Structure (Core)

```
src/
 ├── app.js
 ├── server.js
 ├── routes/
 ├── controllers/
 ├── services/
 ├── models/
 ├── validations/
 ├── middlewares/
 ├── exceptions/
```

Each layer has a **single responsibility**.

---

## Architecture Flow

```
HTTP Request
   ↓
Route (URL + method)
   ↓
Validation (Joi)
   ↓
Controller (request orchestration)
   ↓
Service (business logic)
   ↓
Model (database)
```

---

## Modules & CRUD Policy

### Modules WITH CRUD

| Module | Reason                  |
| ------ | ----------------------- |
| Plant  | Master inventory entity |
| Seed   | Master inventory entity |

### Modules WITHOUT CRUD

| Module      | Reason                            |
| ----------- | --------------------------------- |
| Sale        | Financial transaction (immutable) |
| Seed Sowing | Physical event                    |
| Germination | Observation                       |
| Profit      | Derived data                      |

---

## Plant Module

### Responsibilities

* Manage plant inventory
* Store images
* Allow controlled updates

### Endpoints

```
POST   /api/plants
GET    /api/plants
GET    /api/plants/:id
PATCH  /api/plants/:id
DELETE /api/plants/:id 
POST   /api/uploads/plants/:id/image
```

---

## Seed Module

### Responsibilities

* Manage seed batches
* Track usage & expiry
* Attach images

### Endpoints

```
POST   /api/seeds
GET    /api/seeds
GET    /api/seeds/:id
PATCH  /api/seeds/:id
DELETE /api/seeds/:id (soft)
POST   /api/seeds/:id/image
```

---

## Sales Module (Transactional)

### Key Rules

* No update or delete
* Uses MongoDB transactions
* Updates plant inventory atomically

### Endpoints

```
POST /api/sales
GET  /api/sales
GET  /api/sales/:id
```

---

## Profit Module (Read-only)

### Key Rules

* No CRUD
* Calculated dynamically
* Requires date range

### Endpoint

```
GET /api/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

---

## Image Uploads

* Files stored **outside project root**
* Only metadata stored in MongoDB
* Served via static route

```
/uploads/<filename>
```

Supported formats:

* JPEG
* PNG
* WEBP

---

## Error Handling

All errors flow through a **global error handler**.

Standard error shape:

```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pnms?replicaSet=rs0
UPLOADS_BASE_PATH=/home/user/uploads
```

---

## Postman Collection

A complete Postman collection exists covering:

* All CRUD
* Uploads
* Transactions
* Error cases

---

