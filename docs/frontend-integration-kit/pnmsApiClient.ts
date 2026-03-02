export type Role = "SUPER_ADMIN" | "NURSERY_ADMIN" | "STAFF" | "CUSTOMER";

type ApiConfig = {
  baseUrl: string;
  getToken: () => string | null;
};

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  isFormData?: boolean;
};

type ApiEnvelope<T> = {
  message?: string;
  data?: T;
  success?: boolean;
  details?: string[];
};

export class PNMSApiClient {
  private readonly baseUrl: string;
  private readonly getToken: () => string | null;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getToken = config.getToken;
  }

  private async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};

    if (token) headers.Authorization = `Bearer ${token}`;

    const init: RequestInit = {
      method: options.method || "GET",
      headers
    };

    if (options.body !== undefined) {
      if (options.isFormData) {
        init.body = options.body as BodyInit;
      } else {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(options.body);
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      let errorPayload: ApiEnvelope<unknown> | null = null;
      try {
        errorPayload = await response.json();
      } catch {
        // noop
      }

      const message =
        errorPayload?.message ||
        `Request failed (${response.status}) for ${path}`;

      throw new Error(message);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return (await response.blob()) as T;
    }

    const json = (await response.json()) as ApiEnvelope<T> | T;

    // Most PNMS APIs return { message, data }, but sales return raw JSON.
    if (json && typeof json === "object" && "data" in (json as ApiEnvelope<T>)) {
      return ((json as ApiEnvelope<T>).data ?? json) as T;
    }

    return json as T;
  }

  // Auth
  login(payload: { email?: string; phoneNumber?: string; password: string }) {
    return this.request<{ token: string; user: { _id: string; role: Role; nurseryId?: string } }>(
      "/api/auth/login",
      { method: "POST", body: payload }
    );
  }

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.request<{ message: string }>("/api/auth/change-password", { method: "POST", body: payload });
  }

  // Setup flow
  createNursery(payload: { name: string; code: string }) {
    return this.request<{ _id: string }>("/api/nurseries", { method: "POST", body: payload });
  }

  createUser(payload: {
    name: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    role: Role;
    nurseryId?: string;
  }) {
    return this.request<{ _id: string }>("/api/users", { method: "POST", body: payload });
  }

  assignNurseryAdmin(nurseryId: string, payload: { adminUserId: string; isPrimary?: boolean }) {
    return this.request(`/api/nurseries/${nurseryId}/admins`, { method: "POST", body: payload });
  }

  // Core create flow
  createPlantType(payload: {
    name: string;
    category: "VEGETABLE" | "FLOWER" | "FRUIT" | "HERB";
    lifecycleDays: number;
    sellingPrice: number;
    expectedSeedQtyPerBatch: number;
    expectedSeedUnit?: "SEEDS" | "GRAM" | "KG";
    defaultCostPrice?: number;
    minStockLevel?: number;
    variety?: string;
  }) {
    return this.request<{ _id: string }>("/api/plant-types", { method: "POST", body: payload });
  }

  createSeed(payload: {
    name: string;
    plantType: string;
    supplierName: string;
    totalPurchased: number;
    purchaseDate: string;
    expiryDate: string;
  }) {
    return this.request<{ _id: string }>("/api/seeds", { method: "POST", body: payload });
  }

  createCustomer(payload: { name: string; mobileNumber: string; address?: string }) {
    return this.request<{ _id: string }>("/api/customers", { method: "POST", body: payload });
  }

  createInventory(payload: {
    plantType: string;
    quantity: number;
    unitCost: number;
    purchaseDate?: string;
    paymentMode?: "CASH" | "UPI" | "ONLINE";
    supplierName?: string;
    note?: string;
  }) {
    return this.request<{ _id: string }>("/api/inventory", { method: "POST", body: payload });
  }

  createSale(payload: {
    customer?: string;
    items: Array<{ inventoryId: string; quantity: number }>;
    paymentMode: "CASH" | "UPI" | "ONLINE";
    amountPaid?: number;
    discountAmount?: number;
  }) {
    return this.request<{ _id: string; items: Array<{ _id: string }> }>("/api/sales", {
      method: "POST",
      body: payload
    });
  }

  createPayment(payload: {
    saleId: string;
    amount: number;
    mode: "CASH" | "UPI" | "ONLINE" | "BANK_TRANSFER";
    transactionRef?: string;
  }) {
    return this.request<{ _id: string }>("/api/payments", { method: "POST", body: payload });
  }

  verifyPayment(paymentId: string, payload: { action: "ACCEPT" | "REJECT"; rejectionReason?: string }) {
    return this.request(`/api/payments/${paymentId}/verify`, { method: "POST", body: payload });
  }

  createSowing(payload: { seedId: string; quantity: number; customerId?: string }) {
    return this.request<{ _id: string }>("/api/sowing", { method: "POST", body: payload });
  }

  createGermination(payload: { sowingId: string; germinatedSeeds: number; discardedSeeds?: number }) {
    return this.request<{ _id: string }>("/api/germination", { method: "POST", body: payload });
  }

  createBanner(payload: {
    scope: "GLOBAL_SUPER_ADMIN" | "NURSERY_ADMIN";
    nurseryId?: string;
    title: string;
    redirectUrl?: string;
    startAt: string;
    endAt: string;
    status?: "DRAFT" | "ACTIVE" | "EXPIRED";
  }) {
    return this.request<{ _id: string }>("/api/banners", { method: "POST", body: payload });
  }

  // Reads
  getPayments() {
    return this.request<Array<Record<string, unknown>>>("/api/payments");
  }

  getProfit(startDate: string, endDate: string) {
    return this.request<{ period: { startDate: string; endDate: string } }>(
      `/api/profit?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
  }

  exportReport(payload: { reportType: "SALES" | "PAYMENT_DUES" | "INVENTORY" | "STAFF_ACCOUNTING"; format: "PDF" | "XLSX"; startDate?: string; endDate?: string }) {
    return this.request<{ reportId: string }>("/api/reports/export", { method: "POST", body: payload });
  }

  downloadReport(reportId: string) {
    return this.request<Blob>(`/api/reports/${reportId}/download`);
  }

  // Upload helpers
  uploadPlantTypeImage(plantTypeId: string, file: File) {
    const fd = new FormData();
    fd.append("image", file);
    return this.request(`/api/plant-types/${plantTypeId}/image`, { method: "POST", body: fd, isFormData: true });
  }

  uploadSeedImage(seedId: string, file: File) {
    const fd = new FormData();
    fd.append("image", file);
    return this.request(`/api/seeds/${seedId}/image`, { method: "POST", body: fd, isFormData: true });
  }

  uploadBannerImage(bannerId: string, file: File) {
    const fd = new FormData();
    fd.append("image", file);
    return this.request(`/api/banners/${bannerId}/image`, { method: "POST", body: fd, isFormData: true });
  }
}
