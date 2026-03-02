const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = process.cwd();
const COLLECTION_FILE = path.resolve(ROOT, "postman", "PNMS-Frontend-QA.postman_collection.json");
const OUT_FILE = path.resolve(ROOT, "postman", "PNMS-Frontend-QA.postman_environment.json");
const RESET_AND_SEED_SCRIPT = path.resolve(ROOT, "src/scripts/resetAndSeedData.js");
const SKIP_SEED = process.argv.includes("--skip-seed");

const readCollectionVariables = () => {
  if (!fs.existsSync(COLLECTION_FILE)) {
    throw new Error(`Collection file not found: ${COLLECTION_FILE}`);
  }
  const collection = JSON.parse(fs.readFileSync(COLLECTION_FILE, "utf8"));
  const variables = Array.isArray(collection.variable) ? collection.variable : [];
  return variables.reduce((acc, item) => {
    if (item && item.key) acc[item.key] = item.value ?? "";
    return acc;
  }, {});
};

const parseJsonOutput = (stdout) => {
  const text = String(stdout || "").trim();
  if (!text) throw new Error("Seed script returned empty output");

  try {
    return JSON.parse(text);
  } catch (error) {
    // Some dependencies print logs/objects before final JSON.
    // Walk backwards and parse the last valid JSON object payload.
    for (let start = text.lastIndexOf("{"); start >= 0; start = text.lastIndexOf("{", start - 1)) {
      for (let end = text.lastIndexOf("}"); end > start; end = text.lastIndexOf("}", end - 1)) {
        const candidate = text.slice(start, end + 1).trim();
        try {
          return JSON.parse(candidate);
        } catch (candidateError) {
          // continue search
        }
      }
    }
    throw new Error("Seed output is not valid JSON");
  }
};

const runResetAndSeed = () => {
  const output = execFileSync("node", [RESET_AND_SEED_SCRIPT], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return parseJsonOutput(output);
};

const mergeValues = (collectionVars, seeded) => {
  const values = { ...collectionVars };
  if (seeded.baseUrl) values.baseUrl = seeded.baseUrl;

  const credentials = seeded.credentials || {};
  Object.assign(values, credentials);

  const ids = seeded.ids || {};
  Object.assign(values, ids);

  return Object.entries(values).map(([key, value]) => ({
    key,
    value: value == null ? "" : String(value),
    type: "default",
    enabled: true
  }));
};

(() => {
  const collectionVars = readCollectionVariables();
  let seeded = {};

  if (!SKIP_SEED) {
    seeded = runResetAndSeed();
  }

  const environment = {
    id: crypto.randomUUID(),
    name: "PNMS Frontend QA Local",
    values: mergeValues(collectionVars, seeded),
    _postman_variable_scope: "environment",
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: "PNMS buildFrontendPostmanEnvironment script"
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(environment, null, 2));
  console.log(`Generated ${OUT_FILE}`);
  if (SKIP_SEED) {
    console.log("Seed skipped; generated environment from collection defaults.");
  }
})();
