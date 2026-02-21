# Plant Nursery Management System (PNMS) - Backend API

## Overview
Backend API for a nursery workflow built with Node.js, Express, MongoDB, and Mongoose.

Core lifecycle:
`Seed -> SowingBatch -> Germination -> PlantInventory -> Sale`

Key behavior:
- Seeds are consumables (not directly sellable inventory).
- Inventory is created from germination or purchased stock.
- Sales deduct inventory in FIFO order by batch.
- Profit report is date-range based from sales, expenses, and labour costs.

## Tech Stack
- Node.js (CommonJS)
- Express 5
- MongoDB + Mongoose
- Joi (request validation)
- JWT auth (`jsonwebtoken`)
- Multer (image upload)

## Run Locally
1. Install dependencies:
```bash
npm install
```
2. Configure `.env` (see below).
3. Start dev server:
```bash
npm run dev
```

Server starts on `PORT` (default `5000`), binding to `0.0.0.0`.

Health endpoint:
- `GET /health` -> `{ "status": "OK" }`

## Environment Variables
Required by current code:
- `MONGODB_URI`
- `JWT_SECRET`
- `UPLOADS_BASE_PATH`

Optional:
- `PORT` (default: `5000`)

Example:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/pnms
JWT_SECRET=replace-with-strong-secret
UPLOADS_BASE_PATH=/absolute/path/to/uploads
```

## Auth and RBAC
### Login
- `POST /api/auth/login`
- Public endpoint
- Returns JWT with payload: `{ userId, role }`, expiry `1d`

### Auth Header
Protected endpoints require:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Roles
- `ADMIN`
- `STAFF`
- `VIEWER`

## Role Permission Matrix
| Module / Action | ADMIN | STAFF | VIEWER |
| --- | --- | --- | --- |
| Auth: Login | Yes | Yes | Yes |
| Users: Create / List / Get / Update / Disable | Yes | No | No |
| Plant Types: Create / Update / Delete / Upload Image | Yes | No | No |
| Plant Types: List / Get | Yes | Yes | Yes |
| Seeds: Create / Update / Delete / Upload Image | No | Yes | No |
| Seeds: List / Get | Yes | Yes | Yes |
| Sowing: Create | No | Yes | No |
| Sowing: List | Yes | Yes | Yes |
| Germination: Create | No | Yes | No |
| Germination: List | Yes | Yes | Yes |
| Inventory: Create Purchased Inventory | No | Yes | No |
| Inventory: List / Get | Yes | Yes | Yes |
| Sales: Create | Yes | Yes | No |
| Sales: List / Get | Yes | Yes | Yes |
| Customers: Create / Update / Delete | No | Yes | No |
| Customers: List / Get | Yes | Yes | Yes |
| Expenses: Create / Update / Delete | No | Yes | No |
| Expenses: List / Get | Yes | Yes | Yes |
| Labours: Create / Update / Delete | No | Yes | No |
| Labours: List / Get | Yes | Yes | Yes |
| Profit Report: View | Yes | No | No |

## Request Validation (Joi)
Validation is centralized through middleware (`stripUnknown: true`, `abortEarly: false`).

### ID params
- `:id` must be a 24-char hex Mongo ObjectId.

### Important request constraints
- User create: `password` min length `8`.
- Plant type:
  - `category`: `VEGETABLE | FLOWER | FRUIT | HERB`
  - `growthStages[].stage`: `SEED | SOWN | GERMINATED | HARDENED | READY_FOR_SALE`
  - `growthStages[].dayTo >= dayFrom`
- Seed:
  - `plantType` required ObjectId
  - `totalPurchased >= 1`
  - `expiryDate > purchaseDate`
- Sowing: `quantity >= 1`
- Germination: `germinatedSeeds >= 0`, `discardedSeeds >= 0`
- Purchased inventory:
  - `quantity >= 1`
  - `unitCost >= 0`
  - `paymentMode`: `CASH | UPI | ONLINE`
- Sale:
  - `items[].inventoryId` required
  - `items[].quantity >= 1`
  - `paymentMode`: `CASH | UPI | ONLINE`
- Customer mobile regex: `^[6-9]\d{9}$`
- Expense type:
  - `SEED | FERTILIZER | POT | SOIL | WATER | ELECTRICITY | TRANSPORT | TOOLS | OTHER`
- Labour workType:
  - `SEED_SOWING | WATERING | POTTING | WEEDING | FERTILIZING | PACKING | LOADING`

## Response Format
### Standard wrapped format (most endpoints)
```json
{
  "message": "...",
  "data": {}
}
```

### Error format
```json
{
  "success": false,
  "message": "...",
  "details": ["..."]
}
```

### Known response-shape exceptions in current code
- Sales endpoints return raw document(s), not `{ message, data }`.
  - `POST /api/sales`
  - `GET /api/sales`
  - `GET /api/sales/:id`
- Profit endpoint returns:
```json
{
  "success": true,
  "data": {
    "period": { "startDate": "...", "endDate": "..." },
    "totalSales": 0,
    "totalExpenses": 0,
    "totalLabourCost": 0,
    "totalCost": 0,
    "netProfit": 0
  }
}
```

## Image Upload and URL/Path Enrichment
Image upload endpoints:
- `POST /api/plant-types/:id/image`
- `DELETE /api/plant-types/:id/image/:imageId`
- `POST /api/seeds/:id/image`
- `DELETE /api/seeds/:id/image/:imageId`

Upload constraints:
- Field name: `image`
- MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max size: `2MB`
- Files stored under `UPLOADS_BASE_PATH`
- Static serving route: `/uploads`

For wrapped responses containing model objects with `images`, middleware enriches output with:
- `images[].path` (for example `/uploads/<fileName>`)
- `images[].url` (absolute URL using request host/protocol)
- `imagePath` and `imageUrl` shortcut fields (latest image)

Note: this enrichment runs on responses shaped as `{ ..., data: ... }`. Raw sales responses do not go through this `data` mapper.

## Business Rules Implemented
- User disable is soft (`isActive=false`).
- Seed delete is soft (`isDeleted=true`).
- Plant type delete is blocked when active inventory exists (`quantity > 0`).
- Sowing consumes seed stock (`seedsUsed`).
- Germination cannot exceed remaining sowed quantity.
- Germination creates inventory batch with source tracking.
- Purchased inventory also writes an expense record (`type: OTHER`).
- Inventory cost resolution uses:
  1. Provided `unitCost` if `> 0`
  2. `plantType.defaultCostPrice` if `> 0`
  3. `plantType.sellingPrice` if `> 0`
- Sale deduction is FIFO across available inventory batches by `receivedAt`, `createdAt`.
- Sale stores immutable pricing/cost snapshot per item (`priceAtSale`, `costAtSale`, `profit`).

## Data Models (High Level)
- `User`: name, email (unique), password (hashed), role, isActive, createdBy.
- `PlantType`: name (unique), category, variety, lifecycleDays, growthStages, sellingPrice, minStockLevel, defaultCostPrice, images.
- `Seed`: name, plantType ref, supplierName, totalPurchased, seedsUsed, purchaseDate, expiryDate, images, isDeleted, createdBy/updatedBy.
- `SowingBatch`: seed ref, plantType ref, quantitySown, quantityGerminated, sowingDate, expectedYield, performedBy, roleAtTime.
- `Germination`: sowingId ref, germinatedSeeds, discardedSeeds, germinationDate, inventoryBatch ref, performedBy, roleAtTime.
- `PlantInventory`: plantType ref, sourceType/source/sourceModel/sourceRef, quantity, initialQuantity, unitCost, growthStage, status, receivedAt.
- `Sale`: items[], totalAmount, totalCost, totalProfit, grossMarginPercent, customer ref, paymentMode, saleDate, performedBy, roleAtTime.
- `Customer`: name, mobileNumber (unique), address.
- `Expense`: type, description, amount, date.
- `Labour`: name, workType, hoursWorked, wagePerHour, wagePerDay, date.

## Endpoint Index
### Health
- `GET /health` (public)

### Auth
- `POST /api/auth/login` (public)

### Users (ADMIN)
- `POST /api/users`
- `GET /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id` (disable)

### Plant Types
- `POST /api/plant-types` (ADMIN)
- `GET /api/plant-types` (ADMIN, STAFF, VIEWER)
- `GET /api/plant-types/:id` (ADMIN, STAFF, VIEWER)
- `PATCH /api/plant-types/:id` (ADMIN)
- `DELETE /api/plant-types/:id` (ADMIN)
- `POST /api/plant-types/:id/image` (ADMIN, multipart)
- `DELETE /api/plant-types/:id/image/:imageId` (ADMIN)

### Seeds
- `POST /api/seeds` (STAFF)
- `GET /api/seeds` (ADMIN, STAFF, VIEWER)
- `GET /api/seeds/:id` (ADMIN, STAFF, VIEWER)
- `PATCH /api/seeds/:id` (STAFF)
- `DELETE /api/seeds/:id` (STAFF, soft delete)
- `POST /api/seeds/:id/image` (STAFF, multipart)
- `DELETE /api/seeds/:id/image/:imageId` (STAFF)

### Sowing
- `POST /api/sowing` (STAFF)
- `GET /api/sowing` (ADMIN, STAFF, VIEWER)

### Germination
- `POST /api/germination` (STAFF)
- `GET /api/germination` (ADMIN, STAFF, VIEWER)

### Inventory
- `POST /api/inventory` (STAFF)
- `GET /api/inventory` (ADMIN, STAFF, VIEWER)
- `GET /api/inventory/:id` (ADMIN, STAFF, VIEWER)

### Sales
- `POST /api/sales` (ADMIN, STAFF)
- `GET /api/sales` (ADMIN, STAFF, VIEWER)
- `GET /api/sales/:id` (ADMIN, STAFF, VIEWER)

### Profit
- `GET /api/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (ADMIN)

### Customers
- `POST /api/customers` (STAFF)
- `GET /api/customers` (ADMIN, STAFF, VIEWER)
- `GET /api/customers/:id` (ADMIN, STAFF, VIEWER)
- `PATCH /api/customers/:id` (STAFF)
- `DELETE /api/customers/:id` (STAFF)

### Expenses
- `POST /api/expenses` (STAFF)
- `GET /api/expenses` (ADMIN, STAFF, VIEWER)
- `GET /api/expenses/:id` (ADMIN, STAFF, VIEWER)
- `PATCH /api/expenses/:id` (STAFF)
- `DELETE /api/expenses/:id` (STAFF)

### Labours
- `POST /api/labours` (STAFF)
- `GET /api/labours` (ADMIN, STAFF, VIEWER)
- `GET /api/labours/:id` (ADMIN, STAFF, VIEWER)
- `PATCH /api/labours/:id` (STAFF)
- `DELETE /api/labours/:id` (STAFF)

## Utility Script
Create initial admin user:
```bash
node src/scripts/createAdmin.js
```
Script uses `MONGODB_URI` from `.env` and inserts:
- email: `test@example.com`
- password: `test_pass`
- role: `ADMIN`

## Postman Collections
- `PNMS-postman-collection.json`
- `PNMS-postman-collection-by-role.json`
