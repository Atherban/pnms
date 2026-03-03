const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRateLimiter,
  rejectUnsafePayload
} = require("../src/middlewares/security.middleware");

const createMockRes = () => {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
  return res;
};

test("rejectUnsafePayload blocks mongo operator keys", () => {
  const req = {
    body: { $where: "this.password" },
    query: {},
    params: {}
  };
  const res = createMockRes();
  let nextCalled = false;
  rejectUnsafePayload(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload?.success, false);
});

test("rejectUnsafePayload allows safe payloads", () => {
  const req = {
    body: { name: "PNMS" },
    query: { page: "1" },
    params: { id: "abc123" }
  };
  const res = createMockRes();
  let nextCalled = false;
  rejectUnsafePayload(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.payload, null);
});

test("rate limiter returns 429 after threshold", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });
  const req = { ip: "127.0.0.1", headers: {}, connection: {} };
  const res = createMockRes();
  let nextCalls = 0;

  limiter(req, res, () => {
    nextCalls += 1;
  });
  limiter(req, res, () => {
    nextCalls += 1;
  });
  limiter(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 2);
  assert.equal(res.statusCode, 429);
  assert.equal(res.payload?.success, false);
});
