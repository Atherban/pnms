# Plant Nursery Management System (PNMS) - Backend API

## Overview
PNMS backend is built with Node.js, Express, MongoDB, and Mongoose.

Core lifecycle:
`Seed -> SowingBatch -> Germination -> PlantInventory -> Sale`

Operational rules:
- Seeds are consumables only (not sellable inventory).
- Inventory is created only from germination or purchase.
- Sales deduct stock in FIFO batch order and store profit snapshot.

## Base URL
`http://localhost:5000`

## Auth Header
All protected endpoints require:
`Authorization: Bearer <JWT_TOKEN>`

## Roles (RBAC)
- `ADMIN`: master data + user management + analytics
- `STAFF`: operational create/update/delete
- `VIEWER`: read-only

## Role Permission Matrix
| Module / Action | ADMIN | STAFF | VIEWER |
| --- | --- | --- | --- |
| Auth: Login | Yes | Yes | Yes |
| Users: Create / Update / Disable / View | Yes | No | No |
| Plant Types: Create / Update / Delete / Upload Image | Yes | No | No |
| Plant Types: View | Yes | Yes | Yes |
| Seeds: Create / Update / Delete / Upload Image | No | Yes | No |
| Seeds: View | Yes | Yes | Yes |
| Sowing: Create | No | Yes | No |
| Sowing: View | Yes | Yes | Yes |
| Germination: Create | No | Yes | No |
| Germination: View | Yes | Yes | Yes |
| Inventory: Create (Purchased Inventory) | No | Yes | No |
| Inventory: View | Yes | Yes | Yes |
| Sales: Create | No | Yes | No |
| Sales: View | Yes | Yes | Yes |
| Customers: Create / Update / Delete | No | Yes | No |
| Customers: View | Yes | Yes | Yes |
| Expenses: Create / Update / Delete | No | Yes | No |
| Expenses: View | Yes | Yes | Yes |
| Labours: Create / Update / Delete | No | Yes | No |
| Labours: View | Yes | Yes | Yes |
| Profit Report: View | Yes | No | No |

## Common Response Shapes

### Success
```json
{
  "message": "...",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Validation failed",
  "details": ["optional detailed errors"]
}
```

## Environment Variables
- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `UPLOADS_BASE_PATH`

## Endpoint Index
- `GET /health`
- `POST /api/auth/login`
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/plant-types`
- `GET /api/plant-types`
- `GET /api/plant-types/:id`
- `PATCH /api/plant-types/:id`
- `DELETE /api/plant-types/:id`
- `POST /api/plant-types/:id/image`
- `POST /api/seeds`
- `GET /api/seeds`
- `GET /api/seeds/:id`
- `PATCH /api/seeds/:id`
- `DELETE /api/seeds/:id`
- `POST /api/seeds/:id/image`
- `POST /api/sowing`
- `GET /api/sowing`
- `POST /api/germination`
- `GET /api/germination`
- `POST /api/inventory`
- `GET /api/inventory`
- `GET /api/inventory/:id`
- `POST /api/sales`
- `GET /api/sales`
- `GET /api/sales/:id`
- `GET /api/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `POST /api/customers`
- `GET /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`
- `POST /api/expenses`
- `GET /api/expenses`
- `GET /api/expenses/:id`
- `PATCH /api/expenses/:id`
- `DELETE /api/expenses/:id`
- `POST /api/labours`
- `GET /api/labours`
- `GET /api/labours/:id`
- `PATCH /api/labours/:id`
- `DELETE /api/labours/:id`

## API Contracts

### Health

#### GET /health
Access: Public

Response:
```json
{
  "status": "OK"
}
```

### Auth

#### POST /api/auth/login
Access: Public

Request:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "message": "Login successful",
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "_id": "USER_ID",
      "name": "Admin",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
}
```

### Users

#### POST /api/users
Access: ADMIN

Request:
```json
{
  "name": "Staff One",
  "email": "staff1@example.com",
  "password": "password123",
  "role": "STAFF"
}
```

Response:
```json
{
  "message": "User created successfully",
  "data": {
    "_id": "USER_ID",
    "name": "Staff One",
    "email": "staff1@example.com",
    "role": "STAFF",
    "isActive": true
  }
}
```

#### GET /api/users
Access: ADMIN

Response:
```json
{
  "message": "Users retrieved successfully",
  "data": [
    {
      "_id": "USER_ID",
      "name": "Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "isActive": true
    }
  ]
}
```

#### GET /api/users/:id
Access: ADMIN

Response:
```json
{
  "message": "User retrieved successfully",
  "data": {
    "_id": "USER_ID",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "ADMIN",
    "isActive": true
  }
}
```

#### PATCH /api/users/:id
Access: ADMIN

Request:
```json
{
  "name": "Updated Staff",
  "role": "VIEWER",
  "isActive": true
}
```

Response:
```json
{
  "message": "User updated successfully",
  "data": {
    "_id": "USER_ID",
    "name": "Updated Staff",
    "role": "VIEWER"
  }
}
```

#### DELETE /api/users/:id
Access: ADMIN

Response:
```json
{
  "message": "User disabled successfully",
  "data": {
    "_id": "USER_ID",
    "isActive": false
  }
}
```

### Plant Types

#### POST /api/plant-types
Access: ADMIN

Request:
```json
{
  "name": "Tomato",
  "category": "VEGETABLE",
  "variety": "Cherry",
  "lifecycleDays": 75,
  "sellingPrice": 35,
  "minStockLevel": 30,
  "defaultCostPrice": 12,
  "growthStages": [
    { "stage": "SOWN", "dayFrom": 0, "dayTo": 7 },
    { "stage": "GERMINATED", "dayFrom": 8, "dayTo": 21 },
    { "stage": "READY_FOR_SALE", "dayFrom": 22, "dayTo": 75 }
  ]
}
```

Response:
```json
{
  "message": "PlantType created successfully",
  "data": {
    "_id": "PLANT_TYPE_ID",
    "name": "Tomato",
    "category": "VEGETABLE",
    "sellingPrice": 35
  }
}
```

#### GET /api/plant-types
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "PlantTypes retrieved successfully",
  "data": [
    {
      "_id": "PLANT_TYPE_ID",
      "name": "Tomato",
      "category": "VEGETABLE"
    }
  ]
}
```

#### GET /api/plant-types/:id
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "PlantTypes retrieved successfully",
  "data": {
    "_id": "PLANT_TYPE_ID",
    "name": "Tomato"
  }
}
```

#### PATCH /api/plant-types/:id
Access: ADMIN

Request:
```json
{
  "sellingPrice": 40,
  "minStockLevel": 50
}
```

Response:
```json
{
  "message": "PlantTypes updates successfully",
  "data": {
    "_id": "PLANT_TYPE_ID",
    "sellingPrice": 40,
    "minStockLevel": 50
  }
}
```

#### DELETE /api/plant-types/:id
Access: ADMIN

Response:
```json
{
  "message": "PlantType deleted successfully",
  "data": {
    "_id": "PLANT_TYPE_ID"
  }
}
```

#### POST /api/plant-types/:id/image
Access: ADMIN
Content-Type: multipart/form-data

Form fields:
- `image`: file

Response:
```json
{
  "message": "PlantType image uploaded successfully",
  "data": {
    "_id": "PLANT_TYPE_ID",
    "images": [
      { "fileName": "173...png" }
    ]
  }
}
```

### Seeds

#### POST /api/seeds
Access: STAFF

Request:
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

Response:
```json
{
  "message": "Seed created successfully",
  "data": {
    "_id": "SEED_ID",
    "plantType": "PLANT_TYPE_ID",
    "totalPurchased": 1000,
    "seedsUsed": 0
  }
}
```

#### GET /api/seeds
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Seeds retrieved successfully",
  "data": [
    {
      "_id": "SEED_ID",
      "name": "Tomato Seed Batch A"
    }
  ]
}
```

#### GET /api/seeds/:id
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Seed retrieved successfully",
  "data": {
    "_id": "SEED_ID",
    "name": "Tomato Seed Batch A"
  }
}
```

#### PATCH /api/seeds/:id
Access: STAFF

Request:
```json
{
  "supplierName": "New Supplier",
  "expiryDate": "2027-01-31"
}
```

Response:
```json
{
  "message": "Seed updated successfully",
  "data": {
    "_id": "SEED_ID",
    "supplierName": "New Supplier"
  }
}
```

#### DELETE /api/seeds/:id
Access: STAFF

Response:
```json
{
  "message": "Seed deleted successfully",
  "data": {
    "_id": "SEED_ID",
    "isDeleted": true
  }
}
```

#### POST /api/seeds/:id/image
Access: STAFF
Content-Type: multipart/form-data

Form fields:
- `image`: file

Response:
```json
{
  "message": "Seed image uploaded successfully",
  "data": {
    "_id": "SEED_ID",
    "images": [
      { "fileName": "173...png" }
    ]
  }
}
```

### Sowing

#### POST /api/sowing
Access: STAFF

Request:
```json
{
  "seedId": "SEED_ID",
  "quantity": 200,
  "sowingDate": "2026-02-10",
  "expectedYield": 170
}
```

Response:
```json
{
  "message": "Seeds sown successfully",
  "data": {
    "_id": "SOWING_ID",
    "seed": "SEED_ID",
    "plantType": "PLANT_TYPE_ID",
    "quantitySown": 200
  }
}
```

#### GET /api/sowing
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Sowing records retrieved successfully",
  "data": [
    {
      "_id": "SOWING_ID",
      "quantitySown": 200,
      "quantityGerminated": 0
    }
  ]
}
```

### Germination

#### POST /api/germination
Access: STAFF

Request:
```json
{
  "sowingId": "SOWING_ID",
  "germinatedSeeds": 160,
  "discardedSeeds": 10,
  "germinationDate": "2026-02-18"
}
```

Response:
```json
{
  "message": "Germination recorded successfully",
  "data": {
    "_id": "GERMINATION_ID",
    "sowingId": "SOWING_ID",
    "germinatedSeeds": 160,
    "inventoryBatch": "INVENTORY_ID"
  }
}
```

#### GET /api/germination
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Germination records retrieved successfully",
  "data": [
    {
      "_id": "GERMINATION_ID",
      "germinatedSeeds": 160
    }
  ]
}
```

### Inventory

#### POST /api/inventory
Access: STAFF

Request:
```json
{
  "plantType": "PLANT_TYPE_ID",
  "quantity": 100,
  "unitCost": 15,
  "purchaseDate": "2026-02-20",
  "paymentMode": "CASH",
  "supplierName": "Local Nursery",
  "note": "Purchased ready saplings"
}
```

Response:
```json
{
  "message": "Purchased inventory created successfully",
  "data": {
    "_id": "INVENTORY_ID",
    "sourceType": "PURCHASED",
    "quantity": 100,
    "unitCost": 15
  }
}
```

#### GET /api/inventory
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Inventory retrieved successfully",
  "data": [
    {
      "_id": "INVENTORY_ID",
      "plantType": { "_id": "PLANT_TYPE_ID", "name": "Tomato" },
      "sourceType": "GERMINATION",
      "quantity": 160,
      "status": "AVAILABLE"
    }
  ]
}
```

#### GET /api/inventory/:id
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Inventory item retrieved successfully",
  "data": {
    "_id": "INVENTORY_ID",
    "quantity": 160
  }
}
```

### Sales

#### POST /api/sales
Access: STAFF

Request:
```json
{
  "customer": "CUSTOMER_ID",
  "items": [
    { "inventoryId": "INVENTORY_ID", "quantity": 5 }
  ],
  "paymentMode": "CASH"
}
```

Response:
```json
{
  "_id": "SALE_ID",
  "items": [
    {
      "inventory": "INVENTORY_ID",
      "quantity": 5,
      "priceAtSale": 35,
      "costAtSale": 60,
      "profit": 115,
      "batchDeductions": [
        { "inventory": "INVENTORY_ID", "quantity": 5, "unitCost": 12 }
      ]
    }
  ],
  "totalAmount": 175,
  "totalCost": 60,
  "totalProfit": 115,
  "grossMarginPercent": 65.71,
  "paymentMode": "CASH"
}
```

#### GET /api/sales
Access: ADMIN, STAFF, VIEWER

Response:
```json
[
  {
    "_id": "SALE_ID",
    "totalAmount": 175,
    "totalProfit": 115
  }
]
```

#### GET /api/sales/:id
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "_id": "SALE_ID",
  "totalAmount": 175,
  "items": []
}
```

### Profit

#### GET /api/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Access: ADMIN

Response:
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-12-31T00:00:00.000Z"
    },
    "totalSales": 15000,
    "totalExpenses": 4200,
    "totalLabourCost": 3100,
    "totalCost": 7300,
    "netProfit": 7700
  }
}
```

### Customers

#### POST /api/customers
Access: STAFF

Request:
```json
{
  "name": "Rahul Sharma",
  "mobileNumber": "9876543210",
  "address": "Bengaluru"
}
```

Response:
```json
{
  "message": "Customer created successfully",
  "data": {
    "_id": "CUSTOMER_ID",
    "name": "Rahul Sharma"
  }
}
```

#### GET /api/customers
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Customers retrieved successfully",
  "data": [
    {
      "_id": "CUSTOMER_ID",
      "name": "Rahul Sharma"
    }
  ]
}
```

#### GET /api/customers/:id
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Customer retrieved successfully",
  "data": {
    "_id": "CUSTOMER_ID",
    "name": "Rahul Sharma"
  }
}
```

#### PATCH /api/customers/:id
Access: STAFF

Request:
```json
{
  "address": "Hyderabad"
}
```

Response:
```json
{
  "message": "Customer updated successfully",
  "data": {
    "_id": "CUSTOMER_ID",
    "address": "Hyderabad"
  }
}
```

#### DELETE /api/customers/:id
Access: STAFF

Response:
```json
{
  "message": "Customer deleted successfully",
  "data": {
    "_id": "CUSTOMER_ID"
  }
}
```

### Expenses

#### POST /api/expenses
Access: STAFF

Request:
```json
{
  "type": "SOIL",
  "description": "Soil mix purchase",
  "amount": 2500,
  "date": "2026-02-05"
}
```

Response:
```json
{
  "message": "Expense created successfully",
  "data": {
    "_id": "EXPENSE_ID",
    "type": "SOIL",
    "amount": 2500
  }
}
```

#### GET /api/expenses
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Expenses retrieved successfully",
  "data": [
    {
      "_id": "EXPENSE_ID",
      "type": "SOIL",
      "amount": 2500
    }
  ]
}
```

#### GET /api/expenses/:id
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Expense retrieved successfully",
  "data": {
    "_id": "EXPENSE_ID",
    "amount": 2500
  }
}
```

#### PATCH /api/expenses/:id
Access: STAFF

Request:
```json
{
  "amount": 2700
}
```

Response:
```json
{
  "message": "Expense updated successfully",
  "data": {
    "_id": "EXPENSE_ID",
    "amount": 2700
  }
}
```

#### DELETE /api/expenses/:id
Access: STAFF

Response:
```json
{
  "message": "Expense deleted successfully",
  "data": {
    "_id": "EXPENSE_ID"
  }
}
```

### Labours

#### POST /api/labours
Access: STAFF

Request:
```json
{
  "name": "Worker A",
  "workType": "WATERING",
  "hoursWorked": 6,
  "wagePerHour": 120,
  "date": "2026-02-06"
}
```

Response:
```json
{
  "message": "Labour record created successfully",
  "data": {
    "_id": "LABOUR_ID",
    "name": "Worker A"
  }
}
```

#### GET /api/labours
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Labour records retrieved successfully",
  "data": [
    {
      "_id": "LABOUR_ID",
      "name": "Worker A"
    }
  ]
}
```

#### GET /api/labours/:id
Access: ADMIN, STAFF, VIEWER

Response:
```json
{
  "message": "Labour record retrieved successfully",
  "data": {
    "_id": "LABOUR_ID",
    "name": "Worker A"
  }
}
```

#### PATCH /api/labours/:id
Access: STAFF

Request:
```json
{
  "wagePerHour": 140
}
```

Response:
```json
{
  "message": "Labour record updated successfully",
  "data": {
    "_id": "LABOUR_ID",
    "wagePerHour": 140
  }
}
```

#### DELETE /api/labours/:id
Access: STAFF

Response:
```json
{
  "message": "Labour record deleted successfully",
  "data": {
    "_id": "LABOUR_ID"
  }
}
```

## Recommended End-to-End Test Order
1. Login (`/api/auth/login`) and save token.
2. Create a Plant Type.
3. Create a Seed batch.
4. Create Sowing entry.
5. Record Germination (creates inventory).
6. Create Customer.
7. Create Sale (deducts FIFO inventory).
8. Add Expense and Labour.
9. Check Profit report.

## Postman
Import `PNMS-postman-collection.json`.

Collection variables used:
- `baseUrl`
- `token`
- `userId`
- `plantTypeId`
- `seedId`
- `sowingId`
- `germinationId`
- `inventoryId`
- `customerId`
- `saleId`
- `expenseId`
- `labourId`

The collection has scripts to auto-store token and created IDs.

- Role-based Postman collection: `PNMS-postman-collection-by-role.json`
