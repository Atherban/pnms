
# 🌱 Plant Nursery Management System – Backend

A **production-grade backend API** for managing a plant nursery business, including inventory, seed management, sowing, germination tracking, and operational safety.

This project is built with **Node.js, Express, MongoDB (Mongoose)** following **clean architecture and industry best practices**.

---

## 📌 Key Objectives

- Maintain accurate plant and seed inventory
- Prevent stock inconsistencies and negative inventory
- Track seed sowing and germination losses
- Enforce strict validation and error handling
- Provide scalable and maintainable backend architecture

---

## 🧠 Architecture Overview

This backend follows a **layered architecture**:

```

Route → Validation → Controller → Service → Model → Database

```

### Responsibility Separation

| Layer | Responsibility |
|-----|---------------|
Routes | Define HTTP endpoints |
Validation | Validate request input (Joi) |
Controllers | Request orchestration |
Services | Business logic |
Models | Data schema (Mongoose) |
Middlewares | Cross-cutting concerns |
Exceptions | Typed error handling |

---

## 🗂️ Project Structure

```

src/
├── app.js
├── server.js
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── plant.controller.js
│   ├── seed.controller.js
│   ├── sowing.controller.js
│   └── germination.controller.js
│
├── services/
│   ├── plant.service.js
│   ├── seed.service.js
│   ├── sowing.service.js
│   └── germination.service.js
│
├── models/
│   ├── Plant.model.js
│   ├── Seed.model.js
│   ├── SeedSowing.model.js
│   └── Germination.model.js
│
├── routes/
│   ├── plant.routes.js
│   ├── seed.routes.js
│   ├── sowing.routes.js
│   └── germination.routes.js
│
├── validations/
│   ├── plant.validation.js
│   ├── seed.validation.js
│   ├── sowing.validation.js
│   ├── germination.validation.js
│   └── common.validation.js
│
├── middlewares/
│   ├── validate.js
│   └── errorHandler.js
│
└── exceptions/
└── ApiError.js

````

---

## ⚙️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **ODM:** Mongoose
- **Validation:** Joi
- **Security:** Helmet
- **Env Management:** dotenv

---

## 🔐 Environment Variables

Create a `.env` file at the project root:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nursery_db
NODE_ENV=development
````

⚠️ **Never commit `.env` to version control**

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start MongoDB

Ensure MongoDB is running locally or via Docker.

### 3. Run server

```bash
npm run dev
```

### 4. Health check

```
GET http://localhost:5000/health
```

Expected response:

```json
{ "status": "OK" }
```

---

## 🧪 API Documentation

### Base URL

```
http://localhost:5000/api
```

---

## 🌿 Plant Module

### Create Plant

```
POST /plants
```

```json
{
  "name": "Rose Plant",
  "category": "FLOWER",
  "price": 120,
  "quantityAvailable": 10
}
```

---

### Get All Plants

```
GET /plants
```

---

### Update Plant Quantity

```
PATCH /plants/:id/quantity
```

```json
{
  "quantityChange": -3
}
```

Rules:

* Stock cannot go negative
* Status auto-updates

---

### Mark Plant Out of Stock

```
PATCH /plants/:id/out-of-stock
```

---

## 🌰 Seed Module

### Create Seed

```
POST /seeds
```

```json
{
  "name": "Tomato Seeds",
  "category": "VEGETABLE",
  "supplierName": "Agro Supplier",
  "totalPurchased": 100,
  "purchaseDate": "2026-01-01",
  "expiryDate": "2026-12-31"
}
```

---

### Get All Seeds

```
GET /seeds
```

---

## 🌱 Seed Sowing Module

### Sow Seeds

```
POST /sowing
```

```json
{
  "seedId": "<seedId>",
  "totalSeedsSown": 30,
  "sowingDate": "2026-01-20"
}
```

Rules:

* Cannot sow expired seeds
* Cannot sow more than available stock

---

## 🌼 Germination Module

### Record Germination

```
POST /germination
```

```json
{
  "sowingId": "<sowingId>",
  "germinatedSeeds": 22,
  "germinationDate": "2026-01-25"
}
```

Rules:

* Germinated seeds ≤ seeds sown
* Used to calculate loss percentage

---

## ❗ Error Handling

All errors are handled via a **centralized error handler**.

Example error response:

```json
{
  "success": false,
  "message": "Insufficient seed stock"
}
```

* Validation errors → 400
* Not found errors → 404
* System errors → 500

---

## 🛡️ Validation Strategy

* All request bodies, params, and queries are validated using **Joi**
* MongoDB ObjectIds are validated before DB access
* Unknown fields are stripped automatically

---

## 🔍 Testing

Recommended testing tool:

* **Postman**

Test strategy:

* Happy paths
* Invalid ObjectId
* Negative stock
* Expired seeds
* Business rule violations

