const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const APP_FILE = path.resolve(ROOT, "src/app.js");
const ROUTES_DIR = path.resolve(ROOT, "src/routes");
const COLLECTION_FILE = path.resolve(ROOT, "postman", "PNMS-Frontend-QA.postman_collection.json");

const normalizePath = (value) =>
  String(value || "")
    .replace(/\{\{[^}]+\}\}/g, ":var")
    .replace(/:[A-Za-z0-9_]+/g, ":var")
    .replace(/\/+$/, "");

const normalizeSignature = (method, pathValue) =>
  `${String(method || "").toUpperCase()} ${normalizePath(pathValue)}`.trim();

const backendSignatures = () => {
  const appSource = fs.readFileSync(APP_FILE, "utf8");
  const requires = {};

  for (const m of appSource.matchAll(/const\s+(\w+)\s*=\s*require\("\.\/routes\/([^"]+)"\);/g)) {
    requires[m[1]] = m[2];
  }

  const routeFiles = {};
  for (const m of appSource.matchAll(/app\.use\("([^"]+)",\s*(\w+)\);/g)) {
    if (requires[m[2]]) routeFiles[requires[m[2]]] = m[1];
  }

  const signatures = new Set([normalizeSignature("GET", "/health")]);
  for (const [file, basePath] of Object.entries(routeFiles)) {
    const routeSource = fs.readFileSync(path.resolve(ROUTES_DIR, `${file}.js`), "utf8");
    for (const m of routeSource.matchAll(/router\.(get|post|patch|delete|put)\(\s*(?:\n\s*)?"([^"]+)"/g)) {
      const suffix = m[2] === "/" ? "" : m[2];
      signatures.add(normalizeSignature(m[1], `${basePath}${suffix}`));
    }
  }
  return signatures;
};

const collectionSignatures = () => {
  const collection = JSON.parse(fs.readFileSync(COLLECTION_FILE, "utf8"));
  const signatures = new Set();
  const walk = (items = []) => {
    for (const item of items) {
      if (item.request) {
        const raw = String(item.request?.url?.raw || "").replace("{{baseUrl}}", "");
        signatures.add(normalizeSignature(item.request.method, raw.split("?")[0]));
      }
      if (Array.isArray(item.item)) walk(item.item);
    }
  };
  walk(collection.item || []);
  return signatures;
};

(() => {
  const backend = backendSignatures();
  const collection = collectionSignatures();
  const missing = [...backend].filter((item) => !collection.has(item)).sort();

  console.log(`Backend routes: ${backend.size}`);
  console.log(`Collection routes: ${collection.size}`);
  console.log(`Missing routes: ${missing.length}`);
  if (missing.length) {
    console.log(missing.join("\n"));
    process.exit(1);
  }
})();
