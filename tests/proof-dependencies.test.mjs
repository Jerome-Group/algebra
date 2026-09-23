import test from "node:test";
import assert from "node:assert/strict";
import graph from "../docs/audit-2026-09-22/proof_dependencies.json" with { type: "json" };

test("Artinian and Nakayama proof routes are acyclic and do not assume their conclusion", () => {
  const resolved = new Set();
  const visit = (node, path = []) => {
    assert.ok(Object.hasOwn(graph, node), `unknown proof dependency ${node}`);
    assert.ok(
      !path.includes(node),
      `proof cycle: ${[...path, node].join(" → ")}`,
    );
    if (resolved.has(node)) return;
    for (const predecessor of graph[node]) visit(predecessor, [...path, node]);
    resolved.add(node);
  };
  for (const node of Object.keys(graph)) visit(node);
  const radicalAncestors = new Set();
  const collect = (node) => {
    for (const predecessor of graph[node]) {
      radicalAncestors.add(predecessor);
      collect(predecessor);
    }
  };
  collect("radical-nilpotence-imported");
  assert.ok(!radicalAncestors.has("artinian-implies-noetherian"));
  assert.ok(!radicalAncestors.has("nakayama-finitely-generated-module"));
  assert.deepEqual(graph["nakayama-finitely-generated-module"], [
    "jacobson-unit-characterization",
  ]);
});
