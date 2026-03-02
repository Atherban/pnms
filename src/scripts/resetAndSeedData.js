const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User.model");
const Nursery = require("../models/Nursery.model");
const NurseryAdminAssignment = require("../models/NurseryAdminAssignment.model");
const PlantType = require("../models/PlantType.model");
const Seed = require("../models/Seed.model");
const Expense = require("../models/Expense.model");
const Labour = require("../models/Labour.model");
const Banner = require("../models/Banner.model");
const PlantInventory = require("../models/PlantInventory.model");
const Customer = require("../models/Customer.model");
const Sale = require("../models/Sale.model");
const Payment = require("../models/Payment.model");
const Notification = require("../models/Notification.model");
const ReportJob = require("../models/ReportJob.model");
const SowingBatch = require("../models/SowingBatch.model");
const Germination = require("../models/Germination.model");

const SAMPLE = {
  baseUrl: "http://localhost:3000",
  nurseryCode: "PNMSQA01",
  users: {
    superAdmin: {
      name: "QA Super Admin",
      email: "super@example.com",
      phoneNumber: "9999999999",
      password: "test_pass",
      role: "SUPER_ADMIN"
    },
    nurseryAdmin: {
      name: "QA Nursery Admin",
      email: "nurseryadmin@example.com",
      phoneNumber: "9999999998",
      password: "test_pass",
      role: "NURSERY_ADMIN"
    },
    staff: {
      name: "QA Staff",
      email: "staff@example.com",
      phoneNumber: "9999999997",
      password: "test_pass",
      role: "STAFF"
    },
    customer: {
      name: "QA Customer User",
      email: "customer@example.com",
      phoneNumber: "9999999996",
      password: "test_pass",
      role: "CUSTOMER"
    }
  }
};

const createUser = async (payload) => {
  const user = new User(payload);
  await user.save();
  return user;
};

const createPlantType = async (nurseryId, updatedBy, idx) =>
  PlantType.create({
    nurseryId,
    name: `QA Plant Type ${idx}`,
    category: idx % 2 === 0 ? "FLOWER" : "VEGETABLE",
    variety: `Variety-${idx}`,
    lifecycleDays: 30 + idx,
    growthStages: [
      { stage: "SEED", dayFrom: 0, dayTo: 3 },
      { stage: "SOWN", dayFrom: 4, dayTo: 9 },
      { stage: "GERMINATED", dayFrom: 10, dayTo: 18 },
      { stage: "READY_FOR_SALE", dayFrom: 19, dayTo: 35 }
    ],
    sellingPrice: 40 + idx,
    defaultCostPrice: 22 + idx,
    expectedSeedQtyPerBatch: 100 + idx * 10,
    expectedSeedUnit: "SEEDS",
    minStockLevel: 10,
    active: true,
    updatedBy
  });

(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI not set");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();

  const superAdmin = await createUser(SAMPLE.users.superAdmin);

  const nursery = await Nursery.create({
    name: "QA Nursery",
    code: SAMPLE.nurseryCode,
    ownerSuperAdminId: superAdmin._id,
    createdBy: superAdmin._id,
    updatedBy: superAdmin._id,
    status: "ACTIVE",
    settings: {
      paymentConfig: {
        upiId: "qa@upi",
        beneficiaryName: "QA Nursery",
        bankName: "QA Bank",
        accountNumber: "1234567890",
        ifscCode: "HDFC0001234"
      },
      contactDetails: [
        {
          label: "Front Desk",
          phoneNumber: SAMPLE.users.nurseryAdmin.phoneNumber,
          email: "support@qa-nursery.local",
          address: "QA Road, City"
        }
      ]
    }
  });

  const nurseryAdmin = await createUser({
    ...SAMPLE.users.nurseryAdmin,
    nurseryId: nursery._id,
    createdBy: superAdmin._id
  });
  const staff = await createUser({
    ...SAMPLE.users.staff,
    nurseryId: nursery._id,
    createdBy: nurseryAdmin._id
  });
  const customerUser = await createUser({
    ...SAMPLE.users.customer,
    nurseryId: nursery._id,
    createdBy: nurseryAdmin._id
  });

  await NurseryAdminAssignment.create({
    nurseryId: nursery._id,
    adminUserId: nurseryAdmin._id,
    assignedBy: superAdmin._id,
    isPrimary: true
  });

  const customers = [];
  for (let i = 1; i <= 5; i += 1) {
    const customer = await Customer.create({
      nurseryId: nursery._id,
      userId: i === 1 ? customerUser._id : undefined,
      name: `QA Customer ${i}`,
      mobileNumber: `+91991111000${i}`,
      address: `QA Address ${i}`,
      isActive: true
    });
    customers.push(customer);
  }

  const plantTypes = [];
  for (let i = 1; i <= 5; i += 1) {
    plantTypes.push(await createPlantType(nursery._id, nurseryAdmin._id, i));
  }

  const seeds = [];
  for (let i = 1; i <= 5; i += 1) {
    const seed = await Seed.create({
      nurseryId: nursery._id,
      name: `QA Seed ${i}`,
      plantType: plantTypes[i - 1]._id,
      supplierName: `QA Supplier ${i}`,
      totalPurchased: 1000 + i * 100,
      seedsUsed: 20,
      purchaseDate: new Date(Date.now() - i * 86400000),
      expiryDate: new Date(Date.now() + 180 * 86400000),
      createdBy: nurseryAdmin._id
    });
    seeds.push(seed);
  }

  const expenses = [];
  for (let i = 1; i <= 5; i += 1) {
    expenses.push(
      await Expense.create({
        nurseryId: nursery._id,
        type: "OTHER",
        description: `QA_EXPENSE_${i}`,
        purpose: `QA purpose ${i}`,
        amount: 1000 + i * 100,
        date: new Date(),
        purchasedBy: staff._id
      })
    );
  }

  const labours = [];
  for (let i = 1; i <= 5; i += 1) {
    labours.push(
      await Labour.create({
        nurseryId: nursery._id,
        name: `QA Labour ${i}`,
        workType: "WATERING",
        hoursWorked: 6,
        wagePerHour: 80,
        date: new Date()
      })
    );
  }

  const inventory = [];
  for (let i = 1; i <= 5; i += 1) {
    inventory.push(
      await PlantInventory.create({
        nurseryId: nursery._id,
        plantType: plantTypes[i - 1]._id,
        sourceType: "PURCHASED",
        sourceModel: "Expense",
        sourceRef: expenses[i - 1]._id,
        quantity: 30 + i,
        initialQuantity: 30 + i,
        unitCost: 35 + i,
        growthStage: "READY_FOR_SALE",
        status: "AVAILABLE",
        receivedAt: new Date()
      })
    );
  }

  const banners = [];
  for (let i = 1; i <= 3; i += 1) {
    banners.push(
      await Banner.create({
        scope: "NURSERY_ADMIN",
        nurseryId: nursery._id,
        title: `QA Banner ${i}`,
        redirectUrl: "https://example.com",
        priority: 1,
        startAt: new Date(Date.now() - 86400000),
        endAt: new Date(Date.now() + 10 * 86400000),
        status: "ACTIVE",
        createdBy: nurseryAdmin._id
      })
    );
  }

  const sale = await Sale.create({
    nurseryId: nursery._id,
    saleNumber: "SALE-QA-001",
    customer: customers[0]._id,
    items: [
      {
        inventory: inventory[0]._id,
        quantity: 2,
        priceAtSale: 60,
        costAtSale: 70,
        profit: 50,
        batchDeductions: [{ inventory: inventory[0]._id, quantity: 2, unitCost: 35 }]
      }
    ],
    totalAmount: 120,
    grossAmount: 120,
    discountAmount: 0,
    netAmount: 120,
    paidAmount: 20,
    dueAmount: 100,
    paymentStatus: "PARTIALLY_PAID",
    verificationStatus: "PENDING",
    totalCost: 70,
    totalProfit: 50,
    grossMarginPercent: 41.67,
    paymentMode: "UPI",
    performedBy: staff._id,
    roleAtTime: "STAFF",
    saleDate: new Date()
  });

  const payment = await Payment.create({
    nurseryId: nursery._id,
    saleId: sale._id,
    customerId: customers[0]._id,
    amount: 100,
    mode: "UPI",
    status: "PENDING_VERIFICATION",
    transactionRef: "QA-PAY-001",
    receivedAt: new Date()
  });

  const userNotification = await Notification.create({
    nurseryId: nursery._id,
    recipientId: staff._id,
    recipientType: "User",
    type: "PRODUCT_READY",
    title: "QA Notification Staff",
    message: "This is QA user notification",
    status: "SENT",
    sentAt: new Date()
  });

  const reportJob = await ReportJob.create({
    nurseryId: nursery._id,
    reportType: "SALES",
    filters: { qa: true },
    format: "XLSX",
    status: "READY",
    file: {
      name: "qa_report_sales.xlsx.csv",
      mimeType: "text/csv",
      contentBase64: Buffer.from("saleNumber,totalAmount\nSALE-QA-001,120\n").toString("base64")
    },
    requestedBy: nurseryAdmin._id
  });

  const sowing = await SowingBatch.create({
    nurseryId: nursery._id,
    seed: seeds[0]._id,
    plantType: plantTypes[0]._id,
    customerId: customers[0]._id,
    quantitySown: 200,
    quantityGerminated: 80,
    sowingDate: new Date(Date.now() - 3 * 86400000),
    expectedYield: 160,
    performedBy: staff._id,
    roleAtTime: "STAFF"
  });

  const germination = await Germination.create({
    nurseryId: nursery._id,
    sowingId: sowing._id,
    germinatedSeeds: 80,
    discardedSeeds: 5,
    inventoryBatch: inventory[1]._id,
    performedBy: staff._id,
    roleAtTime: "STAFF"
  });

  const output = {
    baseUrl: SAMPLE.baseUrl,
    credentials: {
      superAdminEmail: SAMPLE.users.superAdmin.email,
      nurseryAdminEmail: SAMPLE.users.nurseryAdmin.email,
      staffEmail: SAMPLE.users.staff.email,
      customerEmail: SAMPLE.users.customer.email,
      defaultPassword: SAMPLE.users.superAdmin.password
    },
    ids: {
      nurseryId: String(nursery._id),
      userId: String(staff._id),
      nurseryAdminUserId: String(nurseryAdmin._id),
      staffUserId: String(staff._id),
      customerUserId: String(customerUser._id),
      customerId: String(customers[0]._id),
      plantTypeId: String(plantTypes[0]._id),
      seedId: String(seeds[0]._id),
      expenseId: String(expenses[0]._id),
      labourId: String(labours[0]._id),
      inventoryId: String(inventory[0]._id),
      saleId: String(sale._id),
      saleItemId: String(sale.items[0]._id),
      paymentId: String(payment._id),
      bannerId: String(banners[0]._id),
      reportJobId: String(reportJob._id),
      notificationId: String(userNotification._id),
      sowingId: String(sowing._id),
      germinationId: String(germination._id)
    }
  };

  console.log(JSON.stringify(output, null, 2));
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error("Failed to reset and seed data:", error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // noop
  }
  process.exit(1);
});
