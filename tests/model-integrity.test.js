const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const CustomerSeedBatch = require("../src/models/CustomerSeedBatch.model");
const SowingBatch = require("../src/models/SowingBatch.model");
const Sale = require("../src/models/Sale.model");
const Germination = require("../src/models/Germination.model");

const objectId = () => new mongoose.Types.ObjectId();

test("CustomerSeedBatch rejects germination totals above seeds sown", async () => {
  const batch = new CustomerSeedBatch({
    nurseryId: objectId(),
    customerId: objectId(),
    plantTypeId: objectId(),
    seedQuantity: 1000,
    seedsSown: 600,
    germinatedQuantity: 500,
    discardedQuantity: 200,
    createdBy: objectId()
  });

  await assert.rejects(
    () => batch.validate(),
    /cannot exceed seedsSown/i
  );
});

test("SowingBatch rejects over-processed quantities", async () => {
  const sowing = new SowingBatch({
    nurseryId: objectId(),
    seed: objectId(),
    plantType: objectId(),
    quantitySown: 100,
    quantityGerminated: 80,
    quantityDiscarded: 30
  });

  await assert.rejects(
    () => sowing.validate(),
    /cannot exceed quantitySown/i
  );
});

test("Sale rejects paid amount greater than net amount", async () => {
  const sale = new Sale({
    nurseryId: objectId(),
    saleNumber: "SALE-TEST-001",
    items: [
      {
        inventory: objectId(),
        quantity: 10,
        priceAtSale: 20,
        costAtSale: 10,
        profit: 100,
        batchDeductions: [
          {
            inventory: objectId(),
            quantity: 10,
            unitCost: 10
          }
        ]
      }
    ],
    totalAmount: 200,
    grossAmount: 200,
    discountAmount: 0,
    netAmount: 200,
    paidAmount: 250,
    totalCost: 100,
    totalProfit: 100,
    paymentMode: "CASH",
    performedBy: objectId(),
    roleAtTime: "STAFF"
  });

  await assert.rejects(
    () => sale.validate(),
    /cannot exceed netAmount/i
  );
});

test("Germination requires at least one processed seed", async () => {
  const germination = new Germination({
    nurseryId: objectId(),
    sowingId: objectId(),
    germinatedSeeds: 0,
    discardedSeeds: 0,
    performedBy: objectId(),
    roleAtTime: "STAFF"
  });

  await assert.rejects(
    () => germination.validate(),
    /must be greater than 0/i
  );
});
