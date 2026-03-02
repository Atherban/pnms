const fs = require("fs");
const path = require("path");

const OUT_FILE = path.resolve(process.cwd(), "postman", "PNMS-Frontend-QA.postman_collection.json");

const authHeader = (tokenVar) => ([
  { key: "Authorization", value: `Bearer {{${tokenVar}}}`, type: "text" }
]);

const jsonBody = (obj) => ({
  mode: "raw",
  raw: JSON.stringify(obj, null, 2),
  options: { raw: { language: "json" } }
});

const formDataBody = (fields) => ({ mode: "formdata", formdata: fields });

const buildUrl = (fullPath) => {
  const [pathname, queryString] = fullPath.split("?");
  const url = {
    raw: `{{baseUrl}}${fullPath}`,
    host: ["{{baseUrl}}"],
    path: pathname.replace(/^\//, "").split("/")
  };

  if (queryString) {
    url.query = queryString.split("&").map((pair) => {
      const [key, value = ""] = pair.split("=");
      return { key, value };
    });
  }

  return url;
};

const statusTest = (status) => [
  `pm.test("Status is ${status}", function () {`,
  `  pm.response.to.have.status(${status});`,
  "});"
];

const jsonStatusWith = (status, extra = []) => [
  ...statusTest(status),
  "const res = (() => { try { return pm.response.json(); } catch (e) { return {}; } })();",
  ...extra
];

const requestItem = ({ name, method, path: requestPath, tokenVar, body, formdata, tests }) => {
  const req = {
    name,
    request: {
      method,
      header: [],
      url: buildUrl(requestPath)
    }
  };

  if (tokenVar) req.request.header.push(...authHeader(tokenVar));

  if (body) {
    req.request.header.push({ key: "Content-Type", value: "application/json", type: "text" });
    req.request.body = body;
  }

  if (formdata) req.request.body = formdata;

  if (tests) {
    req.event = [
      {
        listen: "test",
        script: { type: "text/javascript", exec: tests }
      }
    ];
  }

  return req;
};

const folders = [
  {
    name: "01 Setup & Auth",
    item: [
      requestItem({ name: "01. Health Check", method: "GET", path: "/health", tests: statusTest(200) }),
      requestItem({
        name: "02. Login Super Admin",
        method: "POST",
        path: "/api/auth/login",
        body: jsonBody({ email: "{{superAdminEmail}}", password: "{{defaultPassword}}" }),
        tests: jsonStatusWith(200, [
          "if (res?.data?.token) pm.collectionVariables.set('superAdminToken', res.data.token);"
        ])
      }),
      requestItem({
        name: "03. Create Nursery",
        method: "POST",
        path: "/api/nurseries",
        tokenVar: "superAdminToken",
        body: jsonBody({ name: "PNMS Flow Nursery", code: "FLOWNURS01" }),
        tests: jsonStatusWith(201, [
          "const nursery = res?.data || {};",
          "if (nursery?._id) pm.collectionVariables.set('nurseryId', nursery._id);"
        ])
      }),
      requestItem({
        name: "04. Create Nursery Admin User",
        method: "POST",
        path: "/api/users",
        tokenVar: "superAdminToken",
        body: jsonBody({
          name: "Flow Nursery Admin",
          email: "{{nurseryAdminEmail}}",
          phoneNumber: "{{nurseryAdminPhone}}",
          password: "{{defaultPassword}}",
          role: "NURSERY_ADMIN",
          nurseryId: "{{nurseryId}}"
        }),
        tests: jsonStatusWith(201, [
          "const user = res?.data || {};",
          "if (user?._id) pm.collectionVariables.set('nurseryAdminUserId', user._id);"
        ])
      }),
      requestItem({
        name: "05. Assign Nursery Admin",
        method: "POST",
        path: "/api/nurseries/{{nurseryId}}/admins",
        tokenVar: "superAdminToken",
        body: jsonBody({ adminUserId: "{{nurseryAdminUserId}}", isPrimary: true }),
        tests: statusTest(200)
      }),
      requestItem({
        name: "06. Create Staff User",
        method: "POST",
        path: "/api/users",
        tokenVar: "superAdminToken",
        body: jsonBody({
          name: "Flow Staff",
          email: "{{staffEmail}}",
          phoneNumber: "{{staffPhone}}",
          password: "{{defaultPassword}}",
          role: "STAFF",
          nurseryId: "{{nurseryId}}"
        }),
        tests: jsonStatusWith(201, [
          "const user = res?.data || {};",
          "if (user?._id) pm.collectionVariables.set('staffUserId', user._id);",
          "if (user?._id) pm.collectionVariables.set('userId', user._id);"
        ])
      }),
      requestItem({
        name: "07. Create Customer User",
        method: "POST",
        path: "/api/users",
        tokenVar: "superAdminToken",
        body: jsonBody({
          name: "Flow Customer User",
          email: "{{customerEmail}}",
          phoneNumber: "{{customerPhone}}",
          password: "{{defaultPassword}}",
          role: "CUSTOMER",
          nurseryId: "{{nurseryId}}"
        }),
        tests: jsonStatusWith(201, [
          "const user = res?.data || {};",
          "if (user?._id) pm.collectionVariables.set('customerUserId', user._id);"
        ])
      }),
      requestItem({
        name: "08. Login Nursery Admin",
        method: "POST",
        path: "/api/auth/login",
        body: jsonBody({ email: "{{nurseryAdminEmail}}", password: "{{defaultPassword}}" }),
        tests: jsonStatusWith(200, [
          "if (res?.data?.token) pm.collectionVariables.set('nurseryAdminToken', res.data.token);"
        ])
      }),
      requestItem({
        name: "09. Login Staff",
        method: "POST",
        path: "/api/auth/login",
        body: jsonBody({ email: "{{staffEmail}}", password: "{{defaultPassword}}" }),
        tests: jsonStatusWith(200, [
          "if (res?.data?.token) pm.collectionVariables.set('staffToken', res.data.token);"
        ])
      }),
      requestItem({
        name: "10. Login Customer",
        method: "POST",
        path: "/api/auth/login",
        body: jsonBody({ email: "{{customerEmail}}", password: "{{defaultPassword}}" }),
        tests: jsonStatusWith(200, [
          "if (res?.data?.token) pm.collectionVariables.set('customerToken', res.data.token);"
        ])
      })
    ]
  },
  {
    name: "02 Core Create Flow",
    item: [
      requestItem({
        name: "11. Create Plant Type",
        method: "POST",
        path: "/api/plant-types",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({
          name: "Flow Plant Type",
          category: "VEGETABLE",
          variety: "Flow",
          lifecycleDays: 35,
          sellingPrice: 60,
          expectedSeedQtyPerBatch: 120,
          expectedSeedUnit: "SEEDS",
          defaultCostPrice: 40,
          minStockLevel: 5
        }),
        tests: jsonStatusWith(201, [
          "const plantType = res?.data || {};",
          "if (plantType?._id) pm.collectionVariables.set('plantTypeId', plantType._id);"
        ])
      }),
      requestItem({
        name: "12. Create Seed",
        method: "POST",
        path: "/api/seeds",
        tokenVar: "staffToken",
        body: jsonBody({
          name: "Flow Seed",
          plantType: "{{plantTypeId}}",
          supplierName: "Flow Supplier",
          totalPurchased: 500,
          purchaseDate: "2026-01-01",
          expiryDate: "2026-12-31"
        }),
        tests: jsonStatusWith(201, [
          "const seed = res?.data || {};",
          "if (seed?._id) pm.collectionVariables.set('seedId', seed._id);"
        ])
      }),
      requestItem({
        name: "13. Create Customer Profile",
        method: "POST",
        path: "/api/customers",
        tokenVar: "staffToken",
        body: jsonBody({ name: "Flow Customer", mobileNumber: "{{customerPhone}}", address: "Flow Address" }),
        tests: jsonStatusWith(201, [
          "const customer = res?.data || {};",
          "if (customer?._id) pm.collectionVariables.set('customerId', customer._id);"
        ])
      }),
      requestItem({
        name: "14. Create Purchased Inventory",
        method: "POST",
        path: "/api/inventory",
        tokenVar: "staffToken",
        body: jsonBody({
          plantType: "{{plantTypeId}}",
          quantity: 30,
          unitCost: 40,
          purchaseDate: "2026-01-10",
          paymentMode: "UPI",
          supplierName: "Flow Supplier",
          note: "Flow stock"
        }),
        tests: jsonStatusWith(201, [
          "const inv = res?.data || {};",
          "if (inv?._id) pm.collectionVariables.set('inventoryId', inv._id);"
        ])
      }),
      requestItem({
        name: "15. Create Sale",
        method: "POST",
        path: "/api/sales",
        tokenVar: "staffToken",
        body: jsonBody({
          customer: "{{customerId}}",
          paymentMode: "UPI",
          items: [{ inventoryId: "{{inventoryId}}", quantity: 1 }],
          discountAmount: 0,
          amountPaid: 0
        }),
        tests: jsonStatusWith(201, [
          "const sale = res || {};",
          "if (sale?._id) pm.collectionVariables.set('saleId', sale._id);",
          "if (Array.isArray(sale?.items) && sale.items[0]?._id) pm.collectionVariables.set('saleItemId', sale.items[0]._id);"
        ])
      }),
      requestItem({
        name: "16. Create Payment",
        method: "POST",
        path: "/api/payments",
        tokenVar: "customerToken",
        body: jsonBody({ saleId: "{{saleId}}", amount: 50, mode: "UPI", transactionRef: "FLOW-PAY-001" }),
        tests: jsonStatusWith(201, [
          "const payment = res?.data || {};",
          "if (payment?._id) pm.collectionVariables.set('paymentId', payment._id);"
        ])
      }),
      requestItem({
        name: "17. Verify Payment",
        method: "POST",
        path: "/api/payments/{{paymentId}}/verify",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({ action: "ACCEPT" }),
        tests: statusTest(200)
      }),
      requestItem({
        name: "18. Create Sowing",
        method: "POST",
        path: "/api/sowing",
        tokenVar: "staffToken",
        body: jsonBody({ seedId: "{{seedId}}", quantity: 50, customerId: "{{customerId}}" }),
        tests: jsonStatusWith(201, [
          "const sowing = res?.data || {};",
          "if (sowing?._id) pm.collectionVariables.set('sowingId', sowing._id);"
        ])
      }),
      requestItem({
        name: "19. Create Germination",
        method: "POST",
        path: "/api/germination",
        tokenVar: "staffToken",
        body: jsonBody({ sowingId: "{{sowingId}}", germinatedSeeds: 20, discardedSeeds: 2 }),
        tests: jsonStatusWith(201, [
          "const germ = res?.data || {};",
          "if (germ?._id) pm.collectionVariables.set('germinationId', germ._id);"
        ])
      }),
      requestItem({
        name: "20. Create Banner",
        method: "POST",
        path: "/api/banners",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({
          scope: "NURSERY_ADMIN",
          nurseryId: "{{nurseryId}}",
          title: "Flow Banner",
          redirectUrl: "https://example.com",
          startAt: "2026-01-01T00:00:00.000Z",
          endAt: "2026-12-31T23:59:59.000Z",
          status: "ACTIVE"
        }),
        tests: jsonStatusWith(201, [
          "const banner = res?.data || {};",
          "if (banner?._id) pm.collectionVariables.set('bannerId', banner._id);"
        ])
      }),
      requestItem({
        name: "21. Create Expense",
        method: "POST",
        path: "/api/expenses",
        tokenVar: "staffToken",
        body: jsonBody({ type: "OTHER", description: "Flow Expense", purpose: "Testing", amount: 500, date: "2026-01-15" }),
        tests: jsonStatusWith(201, [
          "const expense = res?.data || {};",
          "if (expense?._id) pm.collectionVariables.set('expenseId', expense._id);"
        ])
      }),
      requestItem({
        name: "22. Create Labour",
        method: "POST",
        path: "/api/labours",
        tokenVar: "staffToken",
        body: jsonBody({ name: "Flow Labour", workType: "WATERING", hoursWorked: 4, wagePerHour: 100, date: "2026-01-15" }),
        tests: jsonStatusWith(201, [
          "const labour = res?.data || {};",
          "if (labour?._id) pm.collectionVariables.set('labourId', labour._id);"
        ])
      })
    ]
  },
  {
    name: "03 Reads & Updates",
    item: [
      requestItem({ name: "Get Nurseries", method: "GET", path: "/api/nurseries", tokenVar: "superAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Get Nursery By ID", method: "GET", path: "/api/nurseries/{{nurseryId}}", tokenVar: "superAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Update Nursery", method: "PATCH", path: "/api/nurseries/{{nurseryId}}", tokenVar: "superAdminToken", body: jsonBody({ name: "PNMS Flow Nursery Updated" }), tests: statusTest(200) }),
      requestItem({
        name: "Update Nursery Payment Config",
        method: "PATCH",
        path: "/api/nurseries/{{nurseryId}}/payment-config",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({
          upiId: "flow@upi",
          beneficiaryName: "PNMS Flow Nursery",
          bankName: "Flow Bank",
          accountNumber: "1234567890",
          ifscCode: "HDFC0001234"
        }),
        tests: statusTest(200)
      }),
      requestItem({
        name: "Create Nursery Public Contact",
        method: "POST",
        path: "/api/nurseries/{{nurseryId}}/public-contacts",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({
          label: "Main Helpdesk",
          phoneNumber: "{{nurseryAdminPhone}}",
          email: "public.contact@example.com"
        }),
        tests: jsonStatusWith(201, [
          "const contacts = res?.data?.settings?.contactDetails || [];",
          "if (contacts.length && contacts[contacts.length - 1]?._id) pm.collectionVariables.set('publicContactId', contacts[contacts.length - 1]._id);"
        ])
      }),
      requestItem({
        name: "Update Nursery Public Contact",
        method: "PATCH",
        path: "/api/nurseries/{{nurseryId}}/public-contacts/{{publicContactId}}",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({ label: "Main Helpdesk Updated", address: "Flow Street 101" }),
        tests: statusTest(200)
      }),
      requestItem({ name: "Get Nursery Admins", method: "GET", path: "/api/nurseries/{{nurseryId}}/admins", tokenVar: "superAdminToken", tests: statusTest(200) }),

      requestItem({ name: "Get Users", method: "GET", path: "/api/users", tokenVar: "superAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Get User By ID", method: "GET", path: "/api/users/{{userId}}", tokenVar: "superAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Update User", method: "PATCH", path: "/api/users/{{userId}}", tokenVar: "superAdminToken", body: jsonBody({ name: "Flow Staff Updated" }), tests: statusTest(200) }),

      requestItem({ name: "Get Plant Types", method: "GET", path: "/api/plant-types", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Get Plant Type By ID", method: "GET", path: "/api/plant-types/{{plantTypeId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Update Plant Type", method: "PATCH", path: "/api/plant-types/{{plantTypeId}}", tokenVar: "nurseryAdminToken", body: jsonBody({ minStockLevel: 12 }), tests: statusTest(200) }),

      requestItem({ name: "Get Seeds", method: "GET", path: "/api/seeds", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Get Seed By ID", method: "GET", path: "/api/seeds/{{seedId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Update Seed", method: "PATCH", path: "/api/seeds/{{seedId}}", tokenVar: "staffToken", body: jsonBody({ supplierName: "Flow Supplier Updated" }), tests: statusTest(200) }),

      requestItem({ name: "Get Sowings", method: "GET", path: "/api/sowing", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Get Germinations", method: "GET", path: "/api/germination", tokenVar: "staffToken", tests: statusTest(200) }),

      requestItem({ name: "Get Inventory", method: "GET", path: "/api/inventory", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Get Inventory By ID", method: "GET", path: "/api/inventory/{{inventoryId}}", tokenVar: "staffToken", tests: statusTest(200) }),

      requestItem({ name: "Get Customers", method: "GET", path: "/api/customers", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Get My Profile", method: "GET", path: "/api/customers/me/profile", tokenVar: "customerToken", tests: statusTest(200) }),
      requestItem({ name: "Get Customer By ID", method: "GET", path: "/api/customers/{{customerId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Update My Profile", method: "PATCH", path: "/api/customers/me/profile", tokenVar: "customerToken", body: jsonBody({ address: "Customer Updated Address" }), tests: statusTest(200) }),
      requestItem({ name: "Update Customer", method: "PATCH", path: "/api/customers/{{customerId}}", tokenVar: "staffToken", body: jsonBody({ address: "Flow Updated Address" }), tests: statusTest(200) }),

      requestItem({ name: "Get Sales", method: "GET", path: "/api/sales", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Get Sale By ID", method: "GET", path: "/api/sales/{{saleId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({
        name: "Create Sale Return",
        method: "POST",
        path: "/api/sales/{{saleId}}/returns",
        tokenVar: "staffToken",
        body: jsonBody({ items: [{ saleItemId: "{{saleItemId}}", quantityReturned: 1, inventoryAction: "RESTOCK" }], reason: "Flow return" }),
        tests: statusTest(201)
      }),

      requestItem({ name: "Get Payments", method: "GET", path: "/api/payments", tokenVar: "nurseryAdminToken", tests: statusTest(200) }),

      requestItem({
        name: "Update Banner",
        method: "PATCH",
        path: "/api/banners/{{bannerId}}",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({ title: "Flow Banner Updated", status: "ACTIVE" }),
        tests: statusTest(200)
      }),
      requestItem({ name: "Get Banners (Customer View)", method: "GET", path: "/api/banners", tokenVar: "customerToken", tests: statusTest(200) }),

      requestItem({ name: "Get Expenses", method: "GET", path: "/api/expenses", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Get Expense By ID", method: "GET", path: "/api/expenses/{{expenseId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Update Expense", method: "PATCH", path: "/api/expenses/{{expenseId}}", tokenVar: "staffToken", body: jsonBody({ purpose: "Updated purpose" }), tests: statusTest(200) }),

      requestItem({ name: "Get Labours", method: "GET", path: "/api/labours", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Get Labour By ID", method: "GET", path: "/api/labours/{{labourId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Update Labour", method: "PATCH", path: "/api/labours/{{labourId}}", tokenVar: "staffToken", body: jsonBody({ hoursWorked: 5 }), tests: statusTest(200) }),

      requestItem({
        name: "Create Notification",
        method: "POST",
        path: "/api/notifications",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({
          title: "Flow Notification",
          message: "Notification for full API flow",
          audience: "STAFF",
          nurseryId: "{{nurseryId}}"
        }),
        tests: jsonStatusWith(201, [
          "if (res?.data?._id) pm.collectionVariables.set('notificationId', res.data._id);"
        ])
      }),
      requestItem({
        name: "Get Notifications",
        method: "GET",
        path: "/api/notifications",
        tokenVar: "staffToken",
        tests: jsonStatusWith(200, [
          "if (Array.isArray(res?.data) && res.data[0]?._id) pm.collectionVariables.set('notificationId', res.data[0]._id);"
        ])
      }),
      requestItem({
        name: "Register Push Token",
        method: "POST",
        path: "/api/notifications/push-token",
        tokenVar: "staffToken",
        body: jsonBody({ token: "{{pushToken}}" }),
        tests: statusTest(200)
      }),
      requestItem({
        name: "Update Due Reminder Config",
        method: "PATCH",
        path: "/api/notifications/due-reminder-config",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({ everyDays: 7 }),
        tests: statusTest(200)
      }),
      requestItem({ name: "Mark Notification Read", method: "PATCH", path: "/api/notifications/{{notificationId}}/read", tokenVar: "staffToken", tests: statusTest(200) })
    ]
  },
  {
    name: "04 Reports & Auth Utilities",
    item: [
      requestItem({ name: "Get Profit", method: "GET", path: "/api/profit?startDate=2026-01-01&endDate=2026-12-31", tokenVar: "nurseryAdminToken", tests: statusTest(200) }),
      requestItem({
        name: "Export Report",
        method: "POST",
        path: "/api/reports/export",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({ reportType: "SALES", format: "XLSX", startDate: "2026-01-01", endDate: "2026-12-31" }),
        tests: jsonStatusWith(201, [
          "if (res?.data?.reportId) pm.collectionVariables.set('reportJobId', res.data.reportId);"
        ])
      }),
      requestItem({ name: "Download Report", method: "GET", path: "/api/reports/{{reportJobId}}/download", tokenVar: "nurseryAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Get Staff Accounts", method: "GET", path: "/api/staff-accounts", tokenVar: "nurseryAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Get Soft Delete Audit Logs", method: "GET", path: "/api/audit-logs/soft-deletes?nurseryId={{nurseryId}}", tokenVar: "superAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Get Soft Delete Audit Logs (Alias)", method: "GET", path: "/api/audit-logs/soft-deleted?nurseryId={{nurseryId}}", tokenVar: "superAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Change Password", method: "POST", path: "/api/auth/change-password", tokenVar: "staffToken", body: jsonBody({ currentPassword: "{{defaultPassword}}", newPassword: "{{defaultPassword}}" }), tests: statusTest(200) }),
      requestItem({ name: "Reset User Password", method: "POST", path: "/api/users/{{userId}}/reset-password", tokenVar: "superAdminToken", body: jsonBody({ defaultPassword: "{{defaultPassword}}" }), tests: statusTest(200) })
    ]
  },
  {
    name: "05 Upload Endpoints",
    item: [
      requestItem({
        name: "Upload Plant Type Image",
        method: "POST",
        path: "/api/plant-types/{{plantTypeId}}/image",
        tokenVar: "nurseryAdminToken",
        formdata: formDataBody([{ key: "image", type: "file", src: "" }]),
        tests: jsonStatusWith(200, [
          "const imgs = res?.data?.images || [];",
          "if (imgs.length && imgs[imgs.length - 1]?._id) pm.collectionVariables.set('plantTypeImageId', imgs[imgs.length - 1]._id);"
        ])
      }),
      requestItem({
        name: "Upload Seed Image",
        method: "POST",
        path: "/api/seeds/{{seedId}}/image",
        tokenVar: "staffToken",
        formdata: formDataBody([{ key: "image", type: "file", src: "" }]),
        tests: jsonStatusWith(200, [
          "const imgs = res?.data?.images || [];",
          "if (imgs.length && imgs[imgs.length - 1]?._id) pm.collectionVariables.set('seedImageId', imgs[imgs.length - 1]._id);"
        ])
      }),
      requestItem({
        name: "Upload Nursery Payment QR",
        method: "POST",
        path: "/api/nurseries/{{nurseryId}}/payment-config/qr-image",
        tokenVar: "nurseryAdminToken",
        formdata: formDataBody([{ key: "image", type: "file", src: "" }]),
        tests: statusTest(200)
      }),
      requestItem({
        name: "Upload Public Contact QR",
        method: "POST",
        path: "/api/nurseries/{{nurseryId}}/public-contacts/{{publicContactId}}/qr-image",
        tokenVar: "nurseryAdminToken",
        formdata: formDataBody([{ key: "image", type: "file", src: "" }]),
        tests: statusTest(200)
      }),
      requestItem({
        name: "Upload Banner Image",
        method: "POST",
        path: "/api/banners/{{bannerId}}/image",
        tokenVar: "nurseryAdminToken",
        formdata: formDataBody([{ key: "image", type: "file", src: "" }]),
        tests: statusTest(200)
      })
    ]
  },
  {
    name: "06 Negative Validation (400)",
    item: [
      requestItem({
        name: "Create Nursery - Missing code (400)",
        method: "POST",
        path: "/api/nurseries",
        tokenVar: "superAdminToken",
        body: jsonBody({ name: "Invalid Nursery" }),
        tests: statusTest(400)
      }),
      requestItem({
        name: "Create User - Invalid phone (400)",
        method: "POST",
        path: "/api/users",
        tokenVar: "superAdminToken",
        body: jsonBody({ name: "Bad Phone", email: "bad.phone@example.com", phoneNumber: "123", password: "{{defaultPassword}}", role: "STAFF", nurseryId: "{{nurseryId}}" }),
        tests: statusTest(400)
      }),
      requestItem({
        name: "Create Plant Type - Missing expectedSeedQtyPerBatch (400)",
        method: "POST",
        path: "/api/plant-types",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({ name: "Invalid Plant Type", category: "VEGETABLE", lifecycleDays: 30, sellingPrice: 50 }),
        tests: statusTest(400)
      }),
      requestItem({
        name: "Create Seed - Expiry before purchase (400)",
        method: "POST",
        path: "/api/seeds",
        tokenVar: "staffToken",
        body: jsonBody({ name: "Invalid Seed", plantType: "{{plantTypeId}}", supplierName: "Bad Supplier", totalPurchased: 10, purchaseDate: "2026-12-31", expiryDate: "2026-01-01" }),
        tests: statusTest(400)
      }),
      requestItem({
        name: "Create Sowing - Wrong field name quantitySown (400)",
        method: "POST",
        path: "/api/sowing",
        tokenVar: "staffToken",
        body: jsonBody({ seedId: "{{seedId}}", quantitySown: 10 }),
        tests: statusTest(400)
      }),
      requestItem({
        name: "Verify Payment - Missing rejection reason for REJECT (400)",
        method: "POST",
        path: "/api/payments/{{paymentId}}/verify",
        tokenVar: "nurseryAdminToken",
        body: jsonBody({ action: "REJECT" }),
        tests: statusTest(400)
      })
    ]
  },
  {
    name: "07 Cleanup (Destructive)",
    item: [
      requestItem({ name: "Delete Banner Image", method: "DELETE", path: "/api/banners/{{bannerId}}/image", tokenVar: "nurseryAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Seed Image", method: "DELETE", path: "/api/seeds/{{seedId}}/image/{{seedImageId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Plant Type Image", method: "DELETE", path: "/api/plant-types/{{plantTypeId}}/image/{{plantTypeImageId}}", tokenVar: "nurseryAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Banner", method: "DELETE", path: "/api/banners/{{bannerId}}", tokenVar: "nurseryAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Labour", method: "DELETE", path: "/api/labours/{{labourId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Expense", method: "DELETE", path: "/api/expenses/{{expenseId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Customer", method: "DELETE", path: "/api/customers/{{customerId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({
        name: "List Soft Delete Items",
        method: "GET",
        path: "/api/maintenance/soft-delete/items?nurseryId={{nurseryId}}&collection=customers&limit=5",
        tokenVar: "superAdminToken",
        tests: jsonStatusWith(200, [
          "if (Array.isArray(res?.data) && res.data[0]?.id) pm.collectionVariables.set('softDeleteItemId', res.data[0].id);"
        ])
      }),
      requestItem({
        name: "Hard Delete Soft Deleted Item (200/400)",
        method: "POST",
        path: "/api/maintenance/soft-delete/hard-delete",
        tokenVar: "superAdminToken",
        body: jsonBody({ nurseryId: "{{nurseryId}}", collection: "customers", ids: ["{{softDeleteItemId}}"] }),
        tests: [
          "pm.test('Status is 200 or 400', function () {",
          "  pm.expect([200, 400]).to.include(pm.response.code);",
          "});"
        ]
      }),
      requestItem({
        name: "Purge Soft Deletes",
        method: "POST",
        path: "/api/maintenance/soft-delete/purge",
        tokenVar: "superAdminToken",
        body: jsonBody({ retentionDays: 30, nurseryId: "{{nurseryId}}" }),
        tests: statusTest(200)
      }),
      requestItem({ name: "Disable User", method: "DELETE", path: "/api/users/{{userId}}", tokenVar: "superAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Seed", method: "DELETE", path: "/api/seeds/{{seedId}}", tokenVar: "staffToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Plant Type (Expected 400 if active inventory)", method: "DELETE", path: "/api/plant-types/{{plantTypeId}}", tokenVar: "nurseryAdminToken", tests: [
        "pm.test('Status is 200 or 400', function () {",
        "  pm.expect([200, 400]).to.include(pm.response.code);",
        "});"
      ] }),
      requestItem({ name: "Delete Public Contact", method: "DELETE", path: "/api/nurseries/{{nurseryId}}/public-contacts/{{publicContactId}}", tokenVar: "nurseryAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Remove Nursery Admin", method: "DELETE", path: "/api/nurseries/{{nurseryId}}/admins/{{nurseryAdminUserId}}", tokenVar: "superAdminToken", tests: statusTest(200) }),
      requestItem({ name: "Delete Nursery", method: "DELETE", path: "/api/nurseries/{{nurseryId}}", tokenVar: "superAdminToken", tests: statusTest(200) })
    ]
  }
];

const collection = {
  info: {
    _postman_id: "f2e3e72d-a0b8-4bb4-af8b-3dbe4db8c2ae",
    name: "PNMS Frontend QA - Full API Flow",
    description: "Frontend-focused full API flow with dependency-safe create/read/update/delete coverage and dynamic variable capture.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: folders,
  variable: [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "defaultPassword", value: "test_pass" },
    { key: "superAdminEmail", value: "super@example.com" },
    { key: "superAdminPhone", value: "9999999999" },
    { key: "nurseryAdminEmail", value: "nurseryadmin@example.com" },
    { key: "nurseryAdminPhone", value: "9999999998" },
    { key: "staffEmail", value: "staff@example.com" },
    { key: "staffPhone", value: "9999999997" },
    { key: "customerEmail", value: "customer@example.com" },
    { key: "customerPhone", value: "9999999996" },
    { key: "superAdminToken", value: "" },
    { key: "nurseryAdminToken", value: "" },
    { key: "staffToken", value: "" },
    { key: "customerToken", value: "" },
    { key: "nurseryId", value: "" },
    { key: "userId", value: "" },
    { key: "nurseryAdminUserId", value: "" },
    { key: "staffUserId", value: "" },
    { key: "customerUserId", value: "" },
    { key: "customerId", value: "" },
    { key: "plantTypeId", value: "" },
    { key: "seedId", value: "" },
    { key: "expenseId", value: "" },
    { key: "labourId", value: "" },
    { key: "inventoryId", value: "" },
    { key: "saleId", value: "" },
    { key: "saleItemId", value: "" },
    { key: "paymentId", value: "" },
    { key: "bannerId", value: "" },
    { key: "reportJobId", value: "" },
    { key: "notificationId", value: "" },
    { key: "pushToken", value: "ExponentPushToken[0000000000000000000000]" },
    { key: "sowingId", value: "" },
    { key: "germinationId", value: "" },
    { key: "publicContactId", value: "" },
    { key: "softDeleteItemId", value: "" },
    { key: "plantTypeImageId", value: "" },
    { key: "seedImageId", value: "" }
  ]
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(collection, null, 2));
console.log(`Generated ${OUT_FILE}`);
