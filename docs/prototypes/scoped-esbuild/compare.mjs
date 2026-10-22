import fs from "node:fs";
import crypto from "node:crypto";

const base = "docs/prototypes/scoped-esbuild/evidence";
const variants = Object.fromEntries(
  ["baseline", "candidate"].map((name) => [
    name,
    JSON.parse(fs.readFileSync(`${base}/${name}/package-lock.json`, "utf8")),
  ]),
);
const production = Object.fromEntries(
  Object.entries(variants).map(([name, lock]) => [
    name,
    Object.fromEntries(
      Object.entries(lock.packages).filter(
        ([key, value]) => key && value.dev !== true,
      ),
    ),
  ]),
);
const canonical = Object.fromEntries(
  Object.entries(production).map(([name, packages]) => [
    name,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(packages).sort(([a], [b]) => a.localeCompare(b)),
      ),
    ),
  ]),
);
const changedLockEntries = [
  ...new Set(
    Object.values(variants).flatMap((lock) => Object.keys(lock.packages)),
  ),
].filter(
  (key) =>
    JSON.stringify(variants.baseline.packages[key]) !==
    JSON.stringify(variants.candidate.packages[key]),
);
const behavior = Object.fromEntries(
  ["esm-path", "dynamic", "cjs-core", "sqlite"].map((name) => {
    const observations = ["baseline", "candidate"].map((variant) =>
      JSON.parse(fs.readFileSync(`${base}/${variant}/${name}.json`, "utf8")),
    );
    return [
      name,
      {
        sameStatus: observations[0].status === observations[1].status,
        sameStdout: observations[0].stdout === observations[1].stdout,
        statuses: observations.map((value) => value.status),
      },
    ];
  }),
);
const sql = Object.fromEntries(
  ["baseline", "candidate"].map((variant) => [
    variant,
    fs.readFileSync(
      `${base}/${variant}/drizzle/` +
        fs
          .readdirSync(`${base}/${variant}/drizzle`)
          .find((file) => file.endsWith(".sql")),
      "utf8",
    ),
  ]),
);
const result = {
  productionCount: Object.fromEntries(
    Object.entries(production).map(([name, packages]) => [
      name,
      Object.keys(packages).length,
    ]),
  ),
  productionHashes: Object.fromEntries(
    Object.entries(canonical).map(([name, value]) => [
      name,
      crypto.createHash("sha256").update(value).digest("hex"),
    ]),
  ),
  productionIdentical: canonical.baseline === canonical.candidate,
  changedLockEntries,
  sqlIdentical: sql.baseline === sql.candidate,
  behavior,
};
fs.writeFileSync(
  `${base}/comparison.json`,
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
