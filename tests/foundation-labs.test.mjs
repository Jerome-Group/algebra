import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  fiberModel,
  operationModel,
  symmetricThree,
  symmetricProduct,
  symmetricInverse,
  cosetModel,
  actionModel,
  actionPropertyGrid,
  cyclicReachability,
  cyclicModule,
} from "../lib/algebra/foundation-labs.ts";
import { labContract } from "../lib/algebra/lab-contracts.ts";
import { learningMetadata } from "../lib/algebra/learning.ts";
const lessons = JSON.parse(
  fs.readFileSync(new URL("../lib/algebra/lessons.json", import.meta.url)),
);

test("fibers distinguish a function from a well-defined descended rule", () => {
  const outputs = [0, 1, 2, 0, 1, 2];
  const valid = fiberModel(outputs, 3, 3);
  assert.deepEqual(valid.fibers, [
    [0, 3],
    [1, 4],
    [2, 5],
  ]);
  assert.equal(valid.surjective, true);
  assert.equal(valid.injective, false);
  assert.equal(valid.wellDefined, true);
  const failure = fiberModel(outputs, 3, 2);
  assert.equal(failure.wellDefined, false);
  const [a, b] = failure.witness;
  assert.equal(a % 2, b % 2);
  assert.notEqual(outputs[a], outputs[b]);
});

test("operation checker keeps closure, inverses and associativity independent", () => {
  for (const size of [3, 4, 5, 6]) {
    const addition = operationModel(size, "addition");
    assert.equal(addition.isGroup, true);
    assert.equal(addition.identity, 0);
    const multiplication = operationModel(size, "multiplication");
    assert.equal(multiplication.isGroup, false);
    assert.equal(multiplication.identity, 1);
    assert.equal(multiplication.missingInverse, 0);
    assert.equal(multiplication.associativityWitness, undefined);
    const subtraction = operationModel(size, "subtraction");
    assert.ok(subtraction.associativityWitness);
    assert.notEqual(
      subtraction.associativityWitness.left,
      subtraction.associativityWitness.right,
    );
    const notClosed = operationModel(size, "unbounded-addition");
    assert.ok(notClosed.closureWitness.value >= size);
    assert.equal(notClosed.associativityWitness, undefined);
    assert.equal(notClosed.isGroup, false);
  }
});

test("S3 multiplication, quotient rejection and every action obey the same composition law", () => {
  const elements = symmetricThree.map((_, i) => i);
  for (const a of elements) {
    assert.equal(symmetricProduct(a, symmetricInverse(a)), 0);
    for (const b of elements)
      for (const c of elements)
        assert.equal(
          symmetricProduct(symmetricProduct(a, b), c),
          symmetricProduct(a, symmetricProduct(b, c)),
        );
  }
  const nonnormal = cosetModel([0, 1]);
  assert.equal(nonnormal.normal, false);
  assert.equal(nonnormal.quotientTable, null);
  assert.notEqual(
    nonnormal.witness.originalClass,
    nonnormal.witness.changedClass,
  );
  const normal = cosetModel([0, 4, 5]);
  assert.deepEqual(normal.quotientTable, [
    [0, 1],
    [1, 0],
  ]);
  for (const action of ["letters", "regular", "conjugation"]) {
    for (const point of actionModel(action, 0).points) {
      const model = actionModel(action, point);
      assert.equal(model.orbit.length * model.stabilizer.length, 6);
      for (const a of elements)
        for (const b of elements)
          assert.equal(
            model.apply(symmetricProduct(a, b), point),
            model.apply(a, model.apply(b, point)),
          );
      assert.deepEqual(
        model.core,
        elements.filter((g) =>
          model.orbit.every((x) => model.apply(g, x) === x),
        ),
      );
    }
  }
  assert.equal(actionModel("conjugation", 0).core.length, 6);
  assert.deepEqual(actionModel("conjugation", 0).kernel, [0]);
  assert.deepEqual(
    actionPropertyGrid().map(
      ({ action, faithful, transitive, free, regular }) => [
        action,
        faithful,
        transitive,
        free,
        regular,
      ],
    ),
    [
      ["letters", true, true, false, false],
      ["regular", true, true, true, true],
      ["conjugation", true, false, false, false],
    ],
  );
});

test("generator words and cyclic module kernels retain the displayed counterexamples", () => {
  const reachability = cyclicReachability(12, [4, -4]);
  assert.deepEqual(reachability.reachable, [0, 4, 8]);
  for (const [element, word] of reachability.words)
    assert.equal(
      ((word.reduce((sum, x) => sum + x, 0) % 12) + 12) % 12,
      element,
    );
  assert.equal(cyclicReachability(12, [5, -5]).reachable.length, 12);
  assert.equal(cyclicModule(3, 2).inverse, 2);
  assert.deepEqual(cyclicModule(3, 2).kernel, [0]);
  assert.equal(cyclicModule(6, 2).inverse, undefined);
  assert.deepEqual(cyclicModule(6, 2).kernel, [0, 3]);
  assert.equal(cyclicModule(6, 2).annihilatorGenerator, 6);
  assert.equal(cyclicModule(6, 2).quotientSize, 2);
});

test("curated laboratories have complete lesson-specific contracts and matching metadata", () => {
  const contracts = JSON.parse(
    fs.readFileSync(
      new URL("../lib/algebra/lab-contracts.json", import.meta.url),
    ),
  );
  const questions = new Set();
  for (const id of Object.keys(contracts)) {
    const lesson = lessons.find((item) => item.id === id);
    assert.ok(lesson, id);
    const contract = labContract(id);
    for (const field of [
      "name",
      "question",
      "prediction",
      "objects",
      "invariant",
      "counterexample",
      "debrief",
      "fallback",
    ])
      assert.ok(contract[field], `${id}:${field}`);
    assert.ok(!questions.has(contract.question), id);
    questions.add(contract.question);
    assert.equal(learningMetadata(lesson).visualisationType, contract.type, id);
    assert.equal(lesson.prompt, contract.prediction, id);
    assert.equal(lesson.labScope, contract.debrief, id);
  }
});

test("existing Explore workspaces retain discoverable mathematical contracts", () => {
  for (const id of [
    "orthogonal-axis-angle",
    "representations-real-complex",
    "linear-quotient",
    "mh2220-semidirect",
  ])
    assert.ok(labContract(id), id);
});
