import { hashValue, canonical } from "../public-math/identity.mjs";
import { fixtureKey } from "./fixtures.mjs";

export function observationRequirements(evidence) {
  const requirements = [];
  const add = (
    intent,
    target,
    state,
    fixture,
    kind,
    expected,
    inputs,
    presentation,
    producer,
    extra = {},
  ) => {
    const identity = { owner: intent.file.file, target, state };
    requirements.push({
      id: hashValue({ ...identity, kind }),
      ...identity,
      fixture: fixtureKey(fixture),
      kind,
      expected,
      inputs,
      presentation,
      producer,
      ...extra,
    });
  };
  for (const { intent } of evidence.receipts) {
    for (const port of intent.ports)
      if (port.output) {
        const samples =
          port.output.kind === "static"
            ? [
                {
                  state: "static",
                  inputs: {},
                  expected: port.output.expected,
                  fixture: port.output.fixture,
                },
              ]
            : port.output.samples;
        for (const sample of samples) {
          const producer = {
            source: port.producer,
            formatter:
              port.output.kind === "dynamic" ? port.output.formatter : null,
          };
          add(
            intent,
            port.id,
            sample.state,
            sample.fixture,
            "content",
            sample.expected,
            sample.inputs,
            port.presentation,
            producer,
          );
          if (port.output.kind === "dynamic" && sample.producerFixture !== null)
            add(
              intent,
              `${port.id}/producer`,
              sample.state,
              sample.producerFixture,
              "producer",
              sample.expected.raw,
              sample.inputs,
              null,
              producer,
            );
        }
      }
    for (const effect of intent.effects) {
      if (effect.samples)
        for (const sample of effect.samples)
          add(
            intent,
            effect.id,
            sample.state,
            sample.fixture,
            effect.kind,
            sample.expected,
            sample.inputs,
            sample.presentation,
            { source: effect.operation, formatter: null },
            effect.kind === "svg-geometry"
              ? {
                  viewBox: effect.expectedViewBox,
                  writers: effect.writers.map(({ id, tag, selector }) => ({
                    id,
                    tag,
                    selector,
                  })),
                  tolerance: effect.tolerance,
                }
              : effect.kind === "numeric-computation"
                ? { expectedBinary64: sample.expectedBinary64 }
                : {},
          );
      else
        for (const fixture of effect.fixtures)
          add(
            intent,
            effect.id,
            fixtureKey(fixture),
            fixture,
            effect.kind,
            effect.kind === "file-reset"
              ? { type: "file", value: "" }
              : effect.kind === "private-download"
                ? {
                    mime: "application/json",
                    owned: true,
                    serialized: true,
                    activated: true,
                    revoked: true,
                    removed: true,
                  }
                : { closedResourceBytes: true },
            {},
            null,
            { source: effect.operation, formatter: null },
          );
    }
  }
  const seen = new Set();
  for (const requirement of requirements) {
    if (seen.has(requirement.id))
      throw new Error("Duplicate observation identity");
    seen.add(requirement.id);
  }
  return requirements.sort((a, b) => a.id.localeCompare(b.id));
}

export function requiredFixtures(evidence) {
  const rows = new Map();
  const add = (fixture) => {
    const key = fixtureKey(fixture);
    if (rows.has(key) && canonical(rows.get(key)) !== canonical(fixture))
      throw new Error("Conflicting fixture identity");
    rows.set(key, fixture);
  };
  for (const { intent } of evidence.receipts) {
    for (const port of intent.ports)
      if (port.output) {
        if (port.output.kind === "static") add(port.output.fixture);
        else
          for (const sample of port.output.samples) {
            add(sample.fixture);
            if (sample.producerFixture !== null) add(sample.producerFixture);
          }
      }
    for (const effect of intent.effects) {
      for (const fixture of effect.fixtures) add(fixture);
      for (const sample of effect.samples ?? []) add(sample.fixture);
    }
  }
  return [...rows]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, declaration]) => ({ id, declaration }));
}
