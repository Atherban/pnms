const test = require("node:test");
const assert = require("node:assert/strict");

const { __private } = require("../src/services/saleReturn.service");

test("partial return computes net adjustment and refund safely", () => {
  const sale = {
    grossAmount: 1000,
    netAmount: 900,
    paidAmount: 600,
    dueAmount: 300,
    paymentStatus: "PARTIALLY_PAID"
  };

  const result = __private.calculateSaleAdjustment(sale, 200);

  assert.equal(result.grossReturnAmount, 200);
  assert.equal(result.netReturnAmount, 180);
  assert.equal(result.adjustedNetAmount, 720);
  assert.equal(result.adjustedPaidAmount, 600);
  assert.equal(result.adjustedDueAmount, 120);
  assert.equal(result.refundAmount, 0);
});

test("full payment refund is capped to paid amount", () => {
  const sale = {
    grossAmount: 1000,
    netAmount: 1000,
    paidAmount: 1000,
    dueAmount: 0,
    paymentStatus: "PAID"
  };

  const result = __private.calculateSaleAdjustment(sale, 1000);

  assert.equal(result.adjustedNetAmount, 0);
  assert.equal(result.refundAmount, 1000);
  assert.equal(result.adjustedPaidAmount, 0);
  assert.equal(result.adjustedDueAmount, 0);
});

test("payment status recomputes from paid/due amounts", () => {
  const sale = { paidAmount: 0, dueAmount: 100, paymentStatus: "PAID" };
  __private.recalculatePaymentStatus(sale);
  assert.equal(sale.paymentStatus, "UNPAID");

  sale.paidAmount = 50;
  sale.dueAmount = 50;
  __private.recalculatePaymentStatus(sale);
  assert.equal(sale.paymentStatus, "PARTIALLY_PAID");

  sale.paidAmount = 100;
  sale.dueAmount = 0;
  __private.recalculatePaymentStatus(sale);
  assert.equal(sale.paymentStatus, "PAID");
});
