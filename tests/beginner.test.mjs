import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false },
});
after(() => vite.close());
const { initialRunway, mapFacts, diagnoseWitness, runwayTransition } =
  await vite.ssrLoadModule("/lib/algebra/beginner.ts");
const { beginnerTargetId, parseDestination } = await vite.ssrLoadModule(
  "/lib/algebra/navigation.ts",
);
const domain = ["0", "1", "2"];

test("all 35 maps and all witnesses agree with independent quantified definitions", () => {
  let count = 0;
  for (const allowed of [
    ["a", "b"],
    ["a", "b", "c"],
  ])
    for (const zero of allowed)
      for (const one of allowed)
        for (const two of allowed) {
          count++;
          const values = { 0: zero, 1: one, 2: two };
          const map = {
            kind: allowed.length === 2 ? "two-outputs" : "three-outputs",
            values,
          };
          const facts = mapFacts(map);
          const onto = allowed.every((y) =>
            domain.some((x) => values[x] === y),
          );
          const oneToOne = domain.every((x) =>
            domain.every((other) => x === other || values[x] !== values[other]),
          );
          assert.equal(facts.surjective, onto, JSON.stringify(map));
          assert.equal(facts.injective, oneToOne, JSON.stringify(map));
          assert.deepEqual(facts.outputs, allowed);
          assert.deepEqual(
            facts.missing,
            allowed.filter((y) => !Object.values(values).includes(y)),
          );
          assert.deepEqual(
            facts.collisions,
            [
              ["0", "1"],
              ["0", "2"],
              ["1", "2"],
            ].filter(([x, other]) => values[x] === values[other]),
          );
          for (const y of ["a", "b", "c"]) {
            assert.deepEqual(
              facts.fibers[y],
              domain.filter((x) => values[x] === y),
            );
            const accepted =
              diagnoseWitness(map, "surjective", {
                kind: "missing-output",
                output: y,
              }).kind === "witness";
            assert.equal(
              accepted,
              allowed.includes(y) && domain.every((x) => values[x] !== y),
            );
          }
          for (const first of domain)
            for (const second of domain) {
              const accepted =
                diagnoseWitness(map, "injective", {
                  kind: "collision",
                  first,
                  second,
                }).kind === "witness";
              assert.equal(
                accepted,
                first !== second && values[first] === values[second],
              );
            }
          for (const input of domain)
            for (const output of allowed) {
              const state = { ...initialRunway(), map };
              const next = runwayTransition(state, {
                kind: "assign",
                input,
                output,
              });
              assert.equal(next.map.values[input], output);
              assert.ok(
                domain.every((x) => allowed.includes(next.map.values[x])),
              );
            }
          const changed = runwayTransition(
            { ...initialRunway(), map },
            {
              kind: "set-codomain",
              codomain: allowed.length === 2 ? "three-outputs" : "two-outputs",
            },
          );
          if (allowed.length === 3 && domain.some((x) => values[x] === "c")) {
            assert.equal(changed.map, map);
            assert.equal(changed.feedback.kind, "refused");
            for (const x of domain.filter((x) => values[x] === "c"))
              assert.ok(changed.feedback.message.includes(x));
          } else {
            assert.deepEqual(changed.map.values, values);
            assert.notEqual(changed.map.kind, map.kind);
          }
        }
  assert.equal(count, 35);
});

test("initial-map feedback diagnoses missing, reached, repeated and different-output selections", () => {
  const { map } = initialRunway();
  assert.match(
    diagnoseWitness(map, "surjective", { kind: "missing-output", output: "a" })
      .message,
    /0,1.*At least one/s,
  );
  assert.match(
    diagnoseWitness(map, "surjective", { kind: "missing-output", output: "b" })
      .message,
    /2.*reaches/s,
  );
  assert.equal(
    diagnoseWitness(map, "surjective", { kind: "missing-output", output: "c" })
      .kind,
    "witness",
  );
  assert.match(
    diagnoseWitness(map, "injective", {
      kind: "collision",
      first: "0",
      second: "0",
    }).message,
    /twice.*distinct/s,
  );
  assert.match(
    diagnoseWitness(map, "injective", {
      kind: "collision",
      first: "0",
      second: "2",
    }).message,
    /f\(0\)=a.*f\(2\)=b/s,
  );
  assert.equal(
    diagnoseWitness(map, "injective", {
      kind: "collision",
      first: "1",
      second: "0",
    }).kind,
    "witness",
  );
  assert.equal(
    diagnoseWitness(map, "surjective", {
      kind: "collision",
      first: "0",
      second: "1",
    }).kind,
    "not-witness",
  );
  assert.equal(
    diagnoseWitness(map, "injective", { kind: "missing-output", output: "c" })
      .kind,
    "not-witness",
  );
});

test("map edits invalidate checked witnesses and codomain removal preserves assignments", () => {
  let state = runwayTransition(initialRunway(), {
    kind: "choose-output",
    output: "c",
  });
  state = runwayTransition(state, { kind: "check" });
  assert.equal(state.feedback.kind, "witness");
  const smaller = runwayTransition(state, {
    kind: "set-codomain",
    codomain: "two-outputs",
  });
  assert.deepEqual(smaller.map.values, state.map.values);
  assert.equal(smaller.feedback, null);
  assert.equal(smaller.selection.output, null);
  assert.equal(smaller.readOutput, "a");
  assert.equal(mapFacts(smaller.map).surjective, true);
  assert.equal(mapFacts(smaller.map).injective, false);
  const assigned = runwayTransition(state, {
    kind: "assign",
    input: "2",
    output: "c",
  });
  assert.equal(assigned.feedback, null);
  assert.equal(assigned.selection.output, null);
  const refused = runwayTransition(assigned, {
    kind: "set-codomain",
    codomain: "two-outputs",
  });
  assert.equal(refused.map, assigned.map);
  assert.match(refused.feedback.message, /Cannot remove.*2.*Reassign/s);
});

test("invalid transitions refuse at the boundary without changing the map", () => {
  const state = initialRunway();
  for (const action of [
    null,
    {},
    { kind: "assign", input: "3", output: "a" },
    { kind: "assign", input: "0", output: "z" },
    { kind: "move", move: "score" },
    { kind: "assign", input: "0", output: "a", extra: true },
    { kind: "choose-input", place: "first", input: "0" },
    { kind: "check" },
  ]) {
    const next = runwayTransition(state, action);
    assert.equal(next.map, state.map);
    assert.equal(next.feedback.kind, "refused");
    assert.ok(next.feedback.message.length > 20);
  }
  const smaller = runwayTransition(state, {
    kind: "set-codomain",
    codomain: "two-outputs",
  });
  for (const kind of ["assign", "choose-output", "read-output"]) {
    const next = runwayTransition(smaller, {
      kind,
      ...(kind === "assign" ? { input: "0" } : {}),
      output: "c",
    });
    assert.equal(next.map, smaller.map);
    assert.equal(next.feedback.kind, "refused");
  }
});

test("start routes validate move and return targets in the existing navigation family", () => {
  const fallback = { mode: "start", move: "name", returnTo: null };
  assert.deepEqual(parseDestination("#start"), fallback);
  const returnTo = { lessonId: "foundations-functions", lab: false };
  assert.deepEqual(parseDestination(`#${beginnerTargetId("read", returnTo)}`), {
    mode: "start",
    move: "read",
    returnTo,
  });
  assert.deepEqual(
    parseDestination(
      `#${beginnerTargetId("change", { ...returnTo, lab: true })}`,
    ).returnTo,
    { ...returnTo, lab: true },
  );
  for (const hash of [
    "#start?move=wrong",
    "#start?return=missing",
    "#start?return=%E0%A4%A",
    "#start?move=read&move=change",
    "#start?lab=1",
    "#start?extra=1",
    "#start?return=foundations-functions&lab=0",
  ])
    assert.deepEqual(parseDestination(hash), fallback, hash);
  assert.equal(parseDestination("#foundations-functions").mode, "lesson");
  assert.equal(parseDestination("#lab:foundations-functions").laboratory, true);
});
