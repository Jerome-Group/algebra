import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function parse(csv) {
  const lines = csv.toString().trim().split("\n");
  const fields = (line) => {
    const values = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        values.push(value);
        value = "";
      } else value += char;
    }
    values.push(value);
    assert.equal(quoted, false);
    return values;
  };
  const header = fields(lines.shift());
  return lines.map((line) => {
    const row = fields(line);
    assert.equal(row.length, header.length);
    return Object.fromEntries(header.map((key, index) => [key, row[index]]));
  });
}

const root = new URL("../docs/audit-2026-09-22/", import.meta.url);
const concepts = parse(fs.readFileSync(new URL("concept_audit.csv", root)));
const visuals = parse(
  fs.readFileSync(new URL("visualisation_backlog.csv", root)),
);
const regressions = parse(
  fs.readFileSync(new URL("prior_regression_check.csv", root)),
);
const checklist = fs.readFileSync(
  new URL("ACCEPTANCE_CHECKLIST.md", root),
  "utf8",
);

test("all 51 release checks have individual verdicts and evidence", () => {
  const checks = checklist
    .split("\n")
    .filter((line) => /^- \[[ x]\] /.test(line));
  assert.equal(checks.length, 51);
  for (const check of checks) {
    assert.match(check, /^- \[x\] /);
    assert.match(check, /— Evidence: `[^`]+`/);
  }
});

test("all 143 concepts have a final, evidence-linked disposition", () => {
  assert.equal(concepts.length, 143);
  assert.equal(new Set(concepts.map((row) => row.site_id)).size, 143);
  for (const row of concepts) {
    assert.ok(row.final_disposition?.trim(), row.site_id);
    assert.ok(!/pending/i.test(row.final_disposition), row.site_id);
    assert.ok(
      row.delivery_evidence?.includes("lib/algebra/") ||
        row.delivery_evidence?.includes("Issue") ||
        row.delivery_evidence?.includes("tests/") ||
        row.delivery_evidence?.includes("docs/"),
      row.site_id,
    );
  }
  assert.ok(
    concepts.some((row) => row.final_disposition.startsWith("deferred")),
  );
});

test("all twenty visual backlog entries name delivered evidence", () => {
  assert.equal(visuals.length, 20);
  for (const row of visuals) {
    assert.equal(row.delivery_status, "delivered", row.id);
    assert.ok(row.delivery_evidence, row.id);
  }
});

test("all fifteen prior regressions name a passing verification path", () => {
  assert.equal(regressions.length, 15);
  for (const row of regressions) {
    assert.match(row.final_verdict, /^PASS/);
    assert.match(row.verification_evidence, /tests\//);
  }
});
